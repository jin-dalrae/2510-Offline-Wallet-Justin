/**
 * Smoke test for OfflineEscrow.
 *
 * Hardhat 3 + Node 24 has a bug in the mocha test task loader, so this
 * script exercises the contract end-to-end without needing the test runner.
 * Run with: npx hardhat run scripts/verify-contract.ts
 */
import { network } from 'hardhat';

const { ethers } = await network.connect();

const ONE_DAY = 24 * 60 * 60;
const USDC = (n: number) => BigInt(n) * 10n ** 6n; // 6 decimals

function assert(cond: any, msg: string) {
    if (!cond) {
        console.error(`❌ FAIL: ${msg}`);
        process.exit(1);
    }
    console.log(`✓ ${msg}`);
}

async function assertReverts(fn: () => Promise<any>, expectedErrorName: string) {
    try {
        await fn();
        console.error(`❌ FAIL: expected revert ${expectedErrorName}, but call succeeded`);
        process.exit(1);
    } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes(expectedErrorName)) {
            console.log(`✓ reverts with ${expectedErrorName}`);
        } else {
            console.error(`❌ FAIL: expected revert ${expectedErrorName}, got: ${msg.slice(0, 200)}`);
            process.exit(1);
        }
    }
}

async function signVoucher(escrow: any, signer: any, params: any): Promise<string> {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const domain = {
        name: 'JustinOfflineEscrow',
        version: '1',
        chainId,
        verifyingContract: await escrow.getAddress(),
    };
    const types = {
        Voucher: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
            { name: 'deadline', type: 'uint256' },
        ],
    };
    return signer.signTypedData(domain, types, params);
}

async function main() {
    const [deployer, alice, bob, eve, relayer] = await ethers.getSigners();
    console.log(`\nRunning OfflineEscrow smoke tests on local network\n`);

    // ----- Deploy -----
    const Token = await ethers.getContractFactory('MockUSDC');
    const token = await Token.deploy();
    await token.waitForDeployment();
    const tokenAddr = await token.getAddress();

    const Escrow = await ethers.getContractFactory('OfflineEscrow');
    const escrow = await Escrow.deploy();
    await escrow.waitForDeployment();
    const escrowAddr = await escrow.getAddress();

    console.log(`  MockUSDC:      ${tokenAddr}`);
    console.log(`  OfflineEscrow: ${escrowAddr}\n`);

    // Fund Alice
    await token.mint(alice.address, USDC(1000));
    await token.connect(alice).approve(escrowAddr, USDC(1000));

    // ===== deposit/withdraw =====
    console.log('--- deposit / withdraw ---');
    const depositTx = await escrow.connect(alice).deposit(tokenAddr, USDC(100));
    await depositTx.wait();
    assert(
        (await escrow.balanceOf(alice.address, tokenAddr)) === USDC(100),
        'deposit locks 100 USDC'
    );

    await (await escrow.connect(alice).withdraw(tokenAddr, USDC(40))).wait();
    assert(
        (await escrow.balanceOf(alice.address, tokenAddr)) === USDC(60),
        'withdraw 40 USDC, 60 remains'
    );

    await assertReverts(
        () => escrow.connect(alice).withdraw(tokenAddr, USDC(999)),
        'InsufficientBalance'
    );

    await assertReverts(
        () => escrow.connect(bob).withdraw(tokenAddr, USDC(10)),
        'InsufficientBalance'
    );

    // ===== happy-path claim =====
    console.log('\n--- claim ---');
    const nonce1 = ethers.hexlify(ethers.randomBytes(32));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + ONE_DAY);

    const voucher1 = {
        from: alice.address,
        to: bob.address,
        token: tokenAddr,
        amount: USDC(30),
        nonce: nonce1,
        deadline,
    };
    const sig1 = await signVoucher(escrow, alice, voucher1);

    const bobBefore = await token.balanceOf(bob.address);
    await (
        await escrow.claim(voucher1.from, voucher1.to, voucher1.token, voucher1.amount, voucher1.nonce, voucher1.deadline, sig1)
    ).wait();
    assert(
        (await token.balanceOf(bob.address)) === bobBefore + USDC(30),
        'Bob receives 30 USDC'
    );
    assert(
        (await escrow.balanceOf(alice.address, tokenAddr)) === USDC(30),
        'Alice escrow drops to 30'
    );

    // ===== nonce replay =====
    await assertReverts(
        () => escrow.claim(voucher1.from, voucher1.to, voucher1.token, voucher1.amount, voucher1.nonce, voucher1.deadline, sig1),
        'NonceAlreadyUsed'
    );

    // ===== relayer can submit on behalf of receiver =====
    const nonce2 = ethers.hexlify(ethers.randomBytes(32));
    const voucher2 = {
        from: alice.address,
        to: bob.address,
        token: tokenAddr,
        amount: USDC(10),
        nonce: nonce2,
        deadline,
    };
    const sig2 = await signVoucher(escrow, alice, voucher2);
    await (
        await escrow
            .connect(relayer)
            .claim(voucher2.from, voucher2.to, voucher2.token, voucher2.amount, voucher2.nonce, voucher2.deadline, sig2)
    ).wait();
    assert(
        (await token.balanceOf(bob.address)) === bobBefore + USDC(40),
        'relayer can submit; funds go to receiver'
    );

    // ===== expired voucher =====
    const expiredNonce = ethers.hexlify(ethers.randomBytes(32));
    const expiredVoucher = {
        from: alice.address,
        to: bob.address,
        token: tokenAddr,
        amount: USDC(5),
        nonce: expiredNonce,
        deadline: BigInt(Math.floor(Date.now() / 1000) - 1),
    };
    const expiredSig = await signVoucher(escrow, alice, expiredVoucher);
    await assertReverts(
        () => escrow.claim(
            expiredVoucher.from, expiredVoucher.to, expiredVoucher.token,
            expiredVoucher.amount, expiredVoucher.nonce, expiredVoucher.deadline, expiredSig
        ),
        'VoucherExpired'
    );

    // ===== forged signature =====
    const forgedNonce = ethers.hexlify(ethers.randomBytes(32));
    const forgedVoucher = {
        from: alice.address,
        to: bob.address,
        token: tokenAddr,
        amount: USDC(5),
        nonce: forgedNonce,
        deadline,
    };
    const eveSig = await signVoucher(escrow, eve, forgedVoucher);
    await assertReverts(
        () => escrow.claim(
            forgedVoucher.from, forgedVoucher.to, forgedVoucher.token,
            forgedVoucher.amount, forgedVoucher.nonce, forgedVoucher.deadline, eveSig
        ),
        'InvalidSignature'
    );

    // ===== claim exceeding balance =====
    const tooBigNonce = ethers.hexlify(ethers.randomBytes(32));
    const tooBigVoucher = {
        from: alice.address,
        to: bob.address,
        token: tokenAddr,
        amount: USDC(999),
        nonce: tooBigNonce,
        deadline,
    };
    const tooBigSig = await signVoucher(escrow, alice, tooBigVoucher);
    await assertReverts(
        () => escrow.claim(
            tooBigVoucher.from, tooBigVoucher.to, tooBigVoucher.token,
            tooBigVoucher.amount, tooBigVoucher.nonce, tooBigVoucher.deadline, tooBigSig
        ),
        'InsufficientBalance'
    );

    // ===== quoteClaim =====
    console.log('\n--- quoteClaim ---');
    const probeNonce = ethers.hexlify(ethers.randomBytes(32));
    const probe = {
        from: alice.address,
        to: bob.address,
        token: tokenAddr,
        amount: USDC(5),
        nonce: probeNonce,
        deadline,
    };
    const probeSig = await signVoucher(escrow, alice, probe);
    const [ok, reason] = await escrow.quoteClaim(
        probe.from, probe.to, probe.token, probe.amount, probe.nonce, probe.deadline, probeSig
    );
    assert(ok === true && reason === 'ok', 'quoteClaim returns ok for valid voucher');

    const [expOk, expReason] = await escrow.quoteClaim(
        probe.from, probe.to, probe.token, probe.amount, probe.nonce,
        BigInt(Math.floor(Date.now() / 1000) - 1),
        probeSig
    );
    assert(expOk === false && expReason === 'expired', 'quoteClaim flags expired voucher');

    console.log('\n✅ All checks passed.\n');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
