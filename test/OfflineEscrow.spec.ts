import { expect } from 'chai';
import { network } from 'hardhat';

const { ethers } = await network.connect();

describe('OfflineEscrow', () => {
    // Constants reused across tests
    const ONE_DAY = 24 * 60 * 60;
    const USDC_AMOUNT = (n: number) => BigInt(n) * 10n ** 6n; // 6 decimals

    async function deploy() {
        const [deployer, alice, bob, eve, relayer] = await ethers.getSigners();

        const Token = await ethers.getContractFactory('MockUSDC');
        const token = await Token.deploy();
        await token.waitForDeployment();

        const Escrow = await ethers.getContractFactory('OfflineEscrow');
        const escrow = await Escrow.deploy();
        await escrow.waitForDeployment();

        // Fund Alice with 1000 USDC.
        await token.mint(alice.address, USDC_AMOUNT(1000));
        await token.connect(alice).approve(await escrow.getAddress(), USDC_AMOUNT(1000));

        return { deployer, alice, bob, eve, relayer, token, escrow };
    }

    /** Build and sign an EIP-712 voucher using `signer` as the sender. */
    async function signVoucher(
        escrow: any,
        signer: any,
        params: {
            from: string;
            to: string;
            token: string;
            amount: bigint;
            nonce: string;
            deadline: bigint;
        }
    ): Promise<string> {
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

    async function increaseTime(seconds: number): Promise<void> {
        await ethers.provider.send('evm_increaseTime', [seconds]);
        await ethers.provider.send('evm_mine', []);
    }

    describe('deposit / delayed withdrawal', () => {
        it('locks tokens, then releases them only after WITHDRAW_DELAY', async () => {
            const { alice, token, escrow } = await deploy();
            const tokenAddr = await token.getAddress();

            await expect(escrow.connect(alice).deposit(tokenAddr, USDC_AMOUNT(100)))
                .to.emit(escrow, 'Deposited')
                .withArgs(alice.address, tokenAddr, USDC_AMOUNT(100), USDC_AMOUNT(100));

            await expect(escrow.connect(alice).requestWithdrawal(tokenAddr, USDC_AMOUNT(40)))
                .to.emit(escrow, 'WithdrawalRequested');

            // Too early.
            await expect(
                escrow.connect(alice).executeWithdrawal(tokenAddr)
            ).to.be.revertedWithCustomError(escrow, 'WithdrawalNotReady');

            const delay: bigint = await escrow.WITHDRAW_DELAY();
            await increaseTime(Number(delay) + 1);

            await expect(escrow.connect(alice).executeWithdrawal(tokenAddr))
                .to.emit(escrow, 'Withdrawn')
                .withArgs(alice.address, tokenAddr, USDC_AMOUNT(40), USDC_AMOUNT(60));

            expect(await escrow.balanceOf(alice.address, tokenAddr)).to.equal(USDC_AMOUNT(60));
        });

        it('lets a pending withdrawal be cancelled', async () => {
            const { alice, token, escrow } = await deploy();
            const tokenAddr = await token.getAddress();
            await escrow.connect(alice).deposit(tokenAddr, USDC_AMOUNT(100));
            await escrow.connect(alice).requestWithdrawal(tokenAddr, USDC_AMOUNT(40));

            await expect(escrow.connect(alice).cancelWithdrawal(tokenAddr))
                .to.emit(escrow, 'WithdrawalCancelled');
            await expect(
                escrow.connect(alice).executeWithdrawal(tokenAddr)
            ).to.be.revertedWithCustomError(escrow, 'NoPendingWithdrawal');
        });

        it('rejects zero-amount deposit', async () => {
            const { alice, token, escrow } = await deploy();
            await expect(
                escrow.connect(alice).deposit(await token.getAddress(), 0n)
            ).to.be.revertedWithCustomError(escrow, 'InvalidVoucher');
        });

        it('rejects withdrawal request exceeding balance', async () => {
            const { alice, token, escrow } = await deploy();
            await escrow.connect(alice).deposit(await token.getAddress(), USDC_AMOUNT(10));
            await expect(
                escrow.connect(alice).requestWithdrawal(await token.getAddress(), USDC_AMOUNT(11))
            ).to.be.revertedWithCustomError(escrow, 'InsufficientBalance');
        });

        it('does not let one user withdraw another user\'s deposit', async () => {
            const { alice, bob, token, escrow } = await deploy();
            await escrow.connect(alice).deposit(await token.getAddress(), USDC_AMOUNT(100));
            await expect(
                escrow.connect(bob).requestWithdrawal(await token.getAddress(), USDC_AMOUNT(50))
            ).to.be.revertedWithCustomError(escrow, 'InsufficientBalance');
        });

        it('a withdrawal cannot rug a receiver holding a still-valid voucher', async () => {
            const { alice, bob, token, escrow } = await deploy();
            const tokenAddr = await token.getAddress();
            await escrow.connect(alice).deposit(tokenAddr, USDC_AMOUNT(100));

            // Alice requests a full withdrawal AND signs a voucher (the rug).
            await escrow.connect(alice).requestWithdrawal(tokenAddr, USDC_AMOUNT(100));
            const blk = await ethers.provider.getBlock('latest');
            const params = {
                from: alice.address,
                to: bob.address,
                token: tokenAddr,
                amount: USDC_AMOUNT(100),
                nonce: ethers.hexlify(ethers.randomBytes(32)),
                deadline: BigInt(blk!.timestamp) + BigInt(ONE_DAY),
            };
            const sig = await signVoucher(escrow, alice, params);

            // Bob claims before the timelock elapses — funds are still there.
            await escrow.claim(
                params.from, params.to, params.token,
                params.amount, params.nonce, params.deadline, sig
            );
            expect(await token.balanceOf(bob.address)).to.equal(USDC_AMOUNT(100));

            // Timelock elapses; the rug fails — nothing left.
            const delay: bigint = await escrow.WITHDRAW_DELAY();
            await increaseTime(Number(delay) + 1);
            await expect(
                escrow.connect(alice).executeWithdrawal(tokenAddr)
            ).to.be.revertedWithCustomError(escrow, 'InsufficientBalance');
        });
    });

    describe('claim', () => {
        it('redeems a valid voucher and pays the receiver', async () => {
            const { alice, bob, token, escrow } = await deploy();
            await escrow.connect(alice).deposit(await token.getAddress(), USDC_AMOUNT(100));

            const nonce = ethers.hexlify(ethers.randomBytes(32));
            const deadline = BigInt(Math.floor(Date.now() / 1000) + ONE_DAY);
            const params = {
                from: alice.address,
                to: bob.address,
                token: await token.getAddress(),
                amount: USDC_AMOUNT(30),
                nonce,
                deadline,
            };
            const sig = await signVoucher(escrow, alice, params);

            const bobBefore = await token.balanceOf(bob.address);
            await expect(
                escrow.claim(params.from, params.to, params.token, params.amount, params.nonce, params.deadline, sig)
            )
                .to.emit(escrow, 'Claimed')
                .withArgs(alice.address, bob.address, await token.getAddress(), USDC_AMOUNT(30), nonce);

            expect(await token.balanceOf(bob.address)).to.equal(bobBefore + USDC_AMOUNT(30));
            expect(await escrow.balanceOf(alice.address, await token.getAddress())).to.equal(USDC_AMOUNT(70));
        });

        it('lets a relayer submit on behalf of the receiver', async () => {
            const { alice, bob, relayer, token, escrow } = await deploy();
            await escrow.connect(alice).deposit(await token.getAddress(), USDC_AMOUNT(50));

            const nonce = ethers.hexlify(ethers.randomBytes(32));
            const deadline = BigInt(Math.floor(Date.now() / 1000) + ONE_DAY);
            const params = {
                from: alice.address,
                to: bob.address,
                token: await token.getAddress(),
                amount: USDC_AMOUNT(15),
                nonce,
                deadline,
            };
            const sig = await signVoucher(escrow, alice, params);

            // Relayer (not bob) submits. Funds still go to bob.
            await escrow
                .connect(relayer)
                .claim(params.from, params.to, params.token, params.amount, params.nonce, params.deadline, sig);

            expect(await token.balanceOf(bob.address)).to.equal(USDC_AMOUNT(15));
            expect(await token.balanceOf(relayer.address)).to.equal(0n);
        });

        it('rejects double-claim with same nonce', async () => {
            const { alice, bob, token, escrow } = await deploy();
            await escrow.connect(alice).deposit(await token.getAddress(), USDC_AMOUNT(100));

            const nonce = ethers.hexlify(ethers.randomBytes(32));
            const deadline = BigInt(Math.floor(Date.now() / 1000) + ONE_DAY);
            const params = {
                from: alice.address,
                to: bob.address,
                token: await token.getAddress(),
                amount: USDC_AMOUNT(30),
                nonce,
                deadline,
            };
            const sig = await signVoucher(escrow, alice, params);

            await escrow.claim(params.from, params.to, params.token, params.amount, params.nonce, params.deadline, sig);

            await expect(
                escrow.claim(params.from, params.to, params.token, params.amount, params.nonce, params.deadline, sig)
            ).to.be.revertedWithCustomError(escrow, 'NonceAlreadyUsed');
        });

        it('rejects expired voucher', async () => {
            const { alice, bob, token, escrow } = await deploy();
            await escrow.connect(alice).deposit(await token.getAddress(), USDC_AMOUNT(100));

            const nonce = ethers.hexlify(ethers.randomBytes(32));
            const deadline = BigInt(Math.floor(Date.now() / 1000) - 1); // already expired
            const params = {
                from: alice.address,
                to: bob.address,
                token: await token.getAddress(),
                amount: USDC_AMOUNT(30),
                nonce,
                deadline,
            };
            const sig = await signVoucher(escrow, alice, params);

            await expect(
                escrow.claim(params.from, params.to, params.token, params.amount, params.nonce, params.deadline, sig)
            ).to.be.revertedWithCustomError(escrow, 'VoucherExpired');
        });

        it('rejects forged signature (different signer)', async () => {
            const { alice, bob, eve, token, escrow } = await deploy();
            await escrow.connect(alice).deposit(await token.getAddress(), USDC_AMOUNT(100));

            const nonce = ethers.hexlify(ethers.randomBytes(32));
            const deadline = BigInt(Math.floor(Date.now() / 1000) + ONE_DAY);
            const params = {
                from: alice.address,
                to: bob.address,
                token: await token.getAddress(),
                amount: USDC_AMOUNT(30),
                nonce,
                deadline,
            };
            // Eve signs claiming to be Alice
            const sig = await signVoucher(escrow, eve, params);

            await expect(
                escrow.claim(params.from, params.to, params.token, params.amount, params.nonce, params.deadline, sig)
            ).to.be.revertedWithCustomError(escrow, 'InvalidSignature');
        });

        it('rejects claim exceeding sender balance', async () => {
            const { alice, bob, token, escrow } = await deploy();
            await escrow.connect(alice).deposit(await token.getAddress(), USDC_AMOUNT(20));

            const nonce = ethers.hexlify(ethers.randomBytes(32));
            const deadline = BigInt(Math.floor(Date.now() / 1000) + ONE_DAY);
            const params = {
                from: alice.address,
                to: bob.address,
                token: await token.getAddress(),
                amount: USDC_AMOUNT(50), // > 20 deposited
                nonce,
                deadline,
            };
            const sig = await signVoucher(escrow, alice, params);

            await expect(
                escrow.claim(params.from, params.to, params.token, params.amount, params.nonce, params.deadline, sig)
            ).to.be.revertedWithCustomError(escrow, 'InsufficientBalance');
        });

        it('rejects a voucher whose deadline is implausibly far out', async () => {
            const { alice, bob, token, escrow } = await deploy();
            await escrow.connect(alice).deposit(await token.getAddress(), USDC_AMOUNT(100));

            const blk = await ethers.provider.getBlock('latest');
            const maxTtl: bigint = await escrow.MAX_VOUCHER_TTL();
            const params = {
                from: alice.address,
                to: bob.address,
                token: await token.getAddress(),
                amount: USDC_AMOUNT(30),
                nonce: ethers.hexlify(ethers.randomBytes(32)),
                deadline: BigInt(blk!.timestamp) + maxTtl + BigInt(ONE_DAY),
            };
            const sig = await signVoucher(escrow, alice, params);

            await expect(
                escrow.claim(params.from, params.to, params.token, params.amount, params.nonce, params.deadline, sig)
            ).to.be.revertedWithCustomError(escrow, 'DeadlineTooFar');
        });

        it('quoteClaim returns reasons for each failure mode', async () => {
            const { alice, bob, eve, token, escrow } = await deploy();
            await escrow.connect(alice).deposit(await token.getAddress(), USDC_AMOUNT(50));

            const nonce = ethers.hexlify(ethers.randomBytes(32));
            const deadline = BigInt(Math.floor(Date.now() / 1000) + ONE_DAY);
            const valid = {
                from: alice.address,
                to: bob.address,
                token: await token.getAddress(),
                amount: USDC_AMOUNT(10),
                nonce,
                deadline,
            };
            const validSig = await signVoucher(escrow, alice, valid);

            const ok = await escrow.quoteClaim(
                valid.from, valid.to, valid.token, valid.amount, valid.nonce, valid.deadline, validSig
            );
            expect(ok[0]).to.equal(true);
            expect(ok[1]).to.equal('ok');

            // Expired
            const expired = await escrow.quoteClaim(
                valid.from, valid.to, valid.token, valid.amount, valid.nonce,
                BigInt(Math.floor(Date.now() / 1000) - 1),
                validSig
            );
            expect(expired[0]).to.equal(false);
            expect(expired[1]).to.equal('expired');

            // Insufficient balance
            const bigAmount = await escrow.quoteClaim(
                valid.from, valid.to, valid.token, USDC_AMOUNT(999), valid.nonce, valid.deadline, validSig
            );
            expect(bigAmount[0]).to.equal(false);
            expect(bigAmount[1]).to.equal('insufficient_balance');

            // Forged sig
            const forgedSig = await signVoucher(escrow, eve, valid);
            const forged = await escrow.quoteClaim(
                valid.from, valid.to, valid.token, valid.amount, valid.nonce, valid.deadline, forgedSig
            );
            expect(forged[0]).to.equal(false);
            expect(forged[1]).to.equal('bad_signature');
        });
    });

    describe('isolation', () => {
        it('two senders can use the same nonce value independently', async () => {
            const { alice, bob, eve, token, escrow } = await deploy();
            // Eve also has some USDC
            await token.mint(eve.address, USDC_AMOUNT(100));
            await token.connect(eve).approve(await escrow.getAddress(), USDC_AMOUNT(100));

            await escrow.connect(alice).deposit(await token.getAddress(), USDC_AMOUNT(50));
            await escrow.connect(eve).deposit(await token.getAddress(), USDC_AMOUNT(50));

            const sharedNonce = ethers.hexlify(ethers.randomBytes(32));
            const deadline = BigInt(Math.floor(Date.now() / 1000) + ONE_DAY);

            const aliceVoucher = {
                from: alice.address,
                to: bob.address,
                token: await token.getAddress(),
                amount: USDC_AMOUNT(10),
                nonce: sharedNonce,
                deadline,
            };
            const eveVoucher = { ...aliceVoucher, from: eve.address };

            const aliceSig = await signVoucher(escrow, alice, aliceVoucher);
            const eveSig = await signVoucher(escrow, eve, eveVoucher);

            // Both should claim successfully
            await escrow.claim(
                aliceVoucher.from, aliceVoucher.to, aliceVoucher.token,
                aliceVoucher.amount, aliceVoucher.nonce, aliceVoucher.deadline, aliceSig
            );
            await escrow.claim(
                eveVoucher.from, eveVoucher.to, eveVoucher.token,
                eveVoucher.amount, eveVoucher.nonce, eveVoucher.deadline, eveSig
            );

            expect(await token.balanceOf(bob.address)).to.equal(USDC_AMOUNT(20));
        });
    });
});
