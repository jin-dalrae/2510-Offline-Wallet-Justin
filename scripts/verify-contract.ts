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

async function blockTime(): Promise<number> {
    const b = await ethers.provider.getBlock('latest');
    return Number(b!.timestamp);
}

async function increaseTime(seconds: number): Promise<void> {
    await ethers.provider.send('evm_increaseTime', [seconds]);
    await ethers.provider.send('evm_mine', []);
}

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

    // ===== deposit + delayed-withdrawal request =====
    console.log('--- deposit / withdrawal request ---');
    const depositTx = await escrow.connect(alice).deposit(tokenAddr, USDC(100));
    await depositTx.wait();
    assert(
        (await escrow.balanceOf(alice.address, tokenAddr)) === USDC(100),
        'deposit locks 100 USDC'
    );

    // A withdrawal can be requested but not executed until the delay elapses.
    await (await escrow.connect(alice).requestWithdrawal(tokenAddr, USDC(40))).wait();
    await assertReverts(
        () => escrow.connect(alice).executeWithdrawal(tokenAddr),
        'WithdrawalNotReady'
    );
    // Cancelling clears the request entirely.
    await (await escrow.connect(alice).cancelWithdrawal(tokenAddr)).wait();
    await assertReverts(
        () => escrow.connect(alice).executeWithdrawal(tokenAddr),
        'NoPendingWithdrawal'
    );
    // Can't request more than the locked balance; non-depositors can't either.
    await assertReverts(
        () => escrow.connect(alice).requestWithdrawal(tokenAddr, USDC(999)),
        'InsufficientBalance'
    );
    await assertReverts(
        () => escrow.connect(bob).requestWithdrawal(tokenAddr, USDC(10)),
        'InsufficientBalance'
    );
    // Alice's full 100 stays locked for the claim tests below.

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
        (await escrow.balanceOf(alice.address, tokenAddr)) === USDC(70),
        'Alice escrow drops to 70 after 30 claimed'
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

    // ===== ERC-1271 smart-wallet signature =====
    console.log('\n--- smart wallet (EIP-1271) ---');
    const SmartWallet = await ethers.getContractFactory('MockSmartWallet');
    const smartWallet = await SmartWallet.deploy(alice.address);
    await smartWallet.waitForDeployment();
    const smartWalletAddr = await smartWallet.getAddress();

    // Fund the smart wallet with USDC, then have it approve+deposit into escrow.
    await token.mint(smartWalletAddr, USDC(50));
    const erc20 = await ethers.getContractAt('MockUSDC', tokenAddr);
    await (await smartWallet.connect(alice).approve(tokenAddr, escrowAddr, USDC(50))).wait();
    const depositData = erc20.interface.encodeFunctionData('balanceOf', [smartWalletAddr]);
    void depositData; // silence unused warning
    const escrowIface = (await ethers.getContractFactory('OfflineEscrow')).interface;
    const depCall = escrowIface.encodeFunctionData('deposit', [tokenAddr, USDC(50)]);
    await (await smartWallet.connect(alice).exec(escrowAddr, depCall)).wait();
    assert(
        (await escrow.balanceOf(smartWalletAddr, tokenAddr)) === USDC(50),
        'smart wallet can deposit into escrow'
    );

    // Alice (the smart-wallet owner) signs an EIP-712 voucher claiming
    // FROM the smart wallet's address. SignatureChecker should call
    // smartWallet.isValidSignature, recover Alice, and accept.
    const swNonce = ethers.hexlify(ethers.randomBytes(32));
    const swVoucher = {
        from: smartWalletAddr,
        to: bob.address,
        token: tokenAddr,
        amount: USDC(12),
        nonce: swNonce,
        deadline,
    };
    const swSig = await signVoucher(escrow, alice, swVoucher);
    const bobBeforeSw = await token.balanceOf(bob.address);
    await (
        await escrow.claim(
            swVoucher.from, swVoucher.to, swVoucher.token,
            swVoucher.amount, swVoucher.nonce, swVoucher.deadline, swSig
        )
    ).wait();
    assert(
        (await token.balanceOf(bob.address)) === bobBeforeSw + USDC(12),
        'smart-wallet voucher claims via EIP-1271 path'
    );

    // Reject when the owner doesn't match — eve signs on behalf of the smart wallet
    const swForgedNonce = ethers.hexlify(ethers.randomBytes(32));
    const swForged = { ...swVoucher, nonce: swForgedNonce };
    const eveSig2 = await signVoucher(escrow, eve, swForged);
    await assertReverts(
        () => escrow.claim(
            swForged.from, swForged.to, swForged.token,
            swForged.amount, swForged.nonce, swForged.deadline, eveSig2
        ),
        'InvalidSignature'
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

    // ===== deadline cap (DeadlineTooFar) =====
    console.log('\n--- deadline cap ---');
    const maxTtl: bigint = await escrow.MAX_VOUCHER_TTL();
    const farNonce = ethers.hexlify(ethers.randomBytes(32));
    const farDeadline = BigInt(await blockTime()) + maxTtl + BigInt(ONE_DAY);
    const farVoucher = {
        from: alice.address, to: bob.address, token: tokenAddr,
        amount: USDC(1), nonce: farNonce, deadline: farDeadline,
    };
    const farSig = await signVoucher(escrow, alice, farVoucher);
    await assertReverts(
        () => escrow.claim(
            farVoucher.from, farVoucher.to, farVoucher.token,
            farVoucher.amount, farVoucher.nonce, farVoucher.deadline, farSig
        ),
        'DeadlineTooFar'
    );
    const [farOk, farReason] = await escrow.quoteClaim(
        farVoucher.from, farVoucher.to, farVoucher.token,
        farVoucher.amount, farVoucher.nonce, farVoucher.deadline, farSig
    );
    assert(
        farOk === false && farReason === 'deadline_too_far',
        'quoteClaim flags deadline_too_far'
    );

    // ===== withdrawal timelock defeats a rug attempt =====
    console.log('\n--- withdrawal timelock / anti-rug ---');
    const WITHDRAW_DELAY: bigint = await escrow.WITHDRAW_DELAY();

    await token.mint(relayer.address, USDC(100));
    await token.connect(relayer).approve(escrowAddr, USDC(100));
    await (await escrow.connect(relayer).deposit(tokenAddr, USDC(100))).wait();
    assert(
        (await escrow.balanceOf(relayer.address, tokenAddr)) === USDC(100),
        'fresh sender locks 100'
    );

    // Sender both requests a full withdrawal AND signs a voucher (the rug).
    await (await escrow.connect(relayer).requestWithdrawal(tokenAddr, USDC(100))).wait();
    await assertReverts(
        () => escrow.connect(relayer).executeWithdrawal(tokenAddr),
        'WithdrawalNotReady'
    );

    const rugNonce = ethers.hexlify(ethers.randomBytes(32));
    const rugDeadline = BigInt(await blockTime()) + BigInt(ONE_DAY);
    const rugVoucher = {
        from: relayer.address, to: deployer.address, token: tokenAddr,
        amount: USDC(100), nonce: rugNonce, deadline: rugDeadline,
    };
    const rugSig = await signVoucher(escrow, relayer, rugVoucher);

    // Receiver claims before the timelock elapses — collateral is still there.
    const depBefore = await token.balanceOf(deployer.address);
    await (await escrow.claim(
        rugVoucher.from, rugVoucher.to, rugVoucher.token,
        rugVoucher.amount, rugVoucher.nonce, rugVoucher.deadline, rugSig
    )).wait();
    assert(
        (await token.balanceOf(deployer.address)) === depBefore + USDC(100),
        'receiver is paid in full before sender can withdraw'
    );
    assert(
        (await escrow.balanceOf(relayer.address, tokenAddr)) === 0n,
        'sender budget drained by the claim'
    );

    // Timelock elapses; the rug fails — nothing left to withdraw.
    await increaseTime(Number(WITHDRAW_DELAY) + 1);
    await assertReverts(
        () => escrow.connect(relayer).executeWithdrawal(tokenAddr),
        'InsufficientBalance'
    );

    // ===== honest delayed withdrawal succeeds =====
    console.log('\n--- delayed withdrawal (happy path) ---');
    await token.mint(eve.address, USDC(30));
    await token.connect(eve).approve(escrowAddr, USDC(30));
    await (await escrow.connect(eve).deposit(tokenAddr, USDC(30))).wait();
    await (await escrow.connect(eve).requestWithdrawal(tokenAddr, USDC(30))).wait();
    await assertReverts(
        () => escrow.connect(eve).executeWithdrawal(tokenAddr),
        'WithdrawalNotReady'
    );
    const eveBefore = await token.balanceOf(eve.address);
    await increaseTime(Number(WITHDRAW_DELAY) + 1);
    await (await escrow.connect(eve).executeWithdrawal(tokenAddr)).wait();
    assert(
        (await token.balanceOf(eve.address)) === eveBefore + USDC(30),
        'sender gets funds back after the delay'
    );
    assert(
        (await escrow.balanceOf(eve.address, tokenAddr)) === 0n,
        'escrow budget cleared after withdrawal'
    );

    console.log('\n✅ All checks passed.\n');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
