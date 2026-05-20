/**
 * OfflineEscrow client.
 *
 * Pairs with contracts/OfflineEscrow.sol. The contract holds user collateral
 * and pays receivers when they submit signed EIP-712 vouchers.
 *
 * Flow:
 *   - Sender (online):   escrow.deposit(token, amount)
 *   - Sender (offline):  escrow.signVoucher(...)  -> hand to receiver via QR/BLE
 *   - Receiver (offline): escrow.verifyVoucher(...)  -> credit locally
 *   - Receiver (online): escrow.claim(voucher)  -> tokens transferred on-chain
 *
 * If VITE_ESCROW_CONTRACT_ADDRESS isn't set, callers should treat escrow
 * features as disabled (use isAvailable() to check).
 */

import { ethers } from 'ethers';
import { JustinSigner, ensureSignerHasProvider } from './signer';
import { blockchain, BASE_SEPOLIA_CONFIG } from './blockchain';
import { isAllowlistedToken } from './tokens';

const ESCROW_ABI = [
    'function balanceOf(address sender, address token) view returns (uint256)',
    'function usedNonce(address sender, bytes32 nonce) view returns (bool)',
    'function pendingWithdrawal(address sender, address token) view returns (uint256)',
    'function withdrawableAt(address sender, address token) view returns (uint256)',
    'function MAX_VOUCHER_TTL() view returns (uint256)',
    'function WITHDRAW_DELAY() view returns (uint256)',
    'function deposit(address token, uint256 amount)',
    'function requestWithdrawal(address token, uint256 amount)',
    'function cancelWithdrawal(address token)',
    'function executeWithdrawal(address token)',
    'function claim(address from, address to, address token, uint256 amount, bytes32 nonce, uint256 deadline, bytes signature)',
    'function quoteClaim(address from, address to, address token, uint256 amount, bytes32 nonce, uint256 deadline, bytes signature) view returns (bool claimable, string reason)',
    'function domainSeparator() view returns (bytes32)',
    'event Deposited(address indexed sender, address indexed token, uint256 amount, uint256 newBalance)',
    'event WithdrawalRequested(address indexed sender, address indexed token, uint256 amount, uint256 executableAt)',
    'event WithdrawalCancelled(address indexed sender, address indexed token)',
    'event Withdrawn(address indexed sender, address indexed token, uint256 amount, uint256 newBalance)',
    'event Claimed(address indexed from, address indexed to, address indexed token, uint256 amount, bytes32 nonce)',
];

const EIP712_DOMAIN_NAME = 'JustinOfflineEscrow';
const EIP712_DOMAIN_VERSION = '1';

/**
 * Must stay <= the contract's MAX_VOUCHER_TTL (48h). The client never signs a
 * voucher whose deadline exceeds this, so the withdrawal-timelock guarantee
 * (WITHDRAW_DELAY >= MAX_VOUCHER_TTL) always holds.
 */
const MAX_VOUCHER_TTL_SECONDS = 48 * 60 * 60;

const VOUCHER_TYPES = {
    Voucher: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
        { name: 'deadline', type: 'uint256' },
    ],
};

/**
 * The signed voucher carried over QR/BLE. version=3 to distinguish from
 * v1/v2 IOU-style vouchers — v3 is redeemable against on-chain escrow.
 */
export interface VoucherV3 {
    version: 3;
    from: string;            // sender wallet address
    to: string;              // receiver wallet address
    token: string;           // ERC20 contract address
    amount: string;          // base-units string (USDC has 6 decimals)
    nonce: string;           // 0x-prefixed 32-byte hex
    deadline: number;        // unix seconds
    signature: string;       // 0x-prefixed EIP-712 signature
    // Convenience metadata (not part of the signed message):
    tokenSymbol?: string;    // 'USDC' | 'EURC' | ...
    humanAmount?: string;    // '5.00' (already-scaled human-readable)
    chainId: number;         // bound to a specific deployment
    escrowAddress: string;   // bound to a specific deployment
}

export interface EscrowAvailability {
    available: boolean;
    reason?: string;
    address?: string;
}

export class EscrowService {
    private readonly contractAddress: string | undefined;
    private readonly chainId: number;
    private readonlyContract: ethers.Contract | null = null;

    constructor() {
        this.contractAddress = import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || undefined;
        this.chainId = BASE_SEPOLIA_CONFIG.chainId;
    }

    /** Quick health check the UI can use to decide whether to expose escrow features. */
    isAvailable(): EscrowAvailability {
        if (!this.contractAddress) {
            return {
                available: false,
                reason: 'OfflineEscrow contract not configured (set VITE_ESCROW_CONTRACT_ADDRESS).',
            };
        }
        if (!ethers.isAddress(this.contractAddress)) {
            return {
                available: false,
                reason: 'VITE_ESCROW_CONTRACT_ADDRESS is not a valid address.',
            };
        }
        return { available: true, address: this.contractAddress };
    }

    /** Read-only contract bound to the public RPC provider. */
    private getReadContract(): ethers.Contract {
        if (!this.contractAddress) throw new Error('Escrow not configured');
        if (!this.readonlyContract) {
            this.readonlyContract = new ethers.Contract(
                this.contractAddress,
                ESCROW_ABI,
                blockchain.getProvider()
            );
        }
        return this.readonlyContract;
    }

    /** Contract bound to a signer (for writes). */
    private getWriteContract(wallet: JustinSigner): ethers.Contract {
        if (!this.contractAddress) throw new Error('Escrow not configured');
        // EOA wallets need a provider attached to broadcast; smart-wallet
        // JsonRpcSigners are already bound to their own (UserOp) provider.
        const signer = ensureSignerHasProvider(wallet, blockchain.getProvider());
        return new ethers.Contract(this.contractAddress, ESCROW_ABI, signer);
    }

    private getDomain() {
        const av = this.isAvailable();
        if (!av.available) throw new Error(av.reason);
        return {
            name: EIP712_DOMAIN_NAME,
            version: EIP712_DOMAIN_VERSION,
            chainId: this.chainId,
            verifyingContract: this.contractAddress!,
        };
    }

    /**
     * Get a sender's currently-locked balance for `token` in the escrow contract.
     * This is the "offline budget" the user can spend without internet.
     */
    async getBudget(sender: string, token: string): Promise<bigint> {
        const c = this.getReadContract();
        return await c.balanceOf(sender, token);
    }

    /**
     * Top up the offline budget. Caller must have approved the token to the
     * escrow contract for at least `amount` first.
     */
    async deposit(
        wallet: JustinSigner,
        token: string,
        amount: bigint
    ): Promise<ethers.TransactionResponse> {
        // First, approve if needed.
        const tokenContract = new ethers.Contract(
            token,
            [
                'function allowance(address owner, address spender) view returns (uint256)',
                'function approve(address spender, uint256 amount) returns (bool)',
            ],
            ensureSignerHasProvider(wallet, blockchain.getProvider())
        );
        const current = await tokenContract.allowance(wallet.address, this.contractAddress);
        if (current < amount) {
            const approveTx = await tokenContract.approve(this.contractAddress, amount);
            await approveTx.wait(1);
        }

        const c = this.getWriteContract(wallet);
        return await c.deposit(token, amount);
    }

    /**
     * Step 1 of 2: request to pull funds back out. Funds stay claimable by
     * outstanding vouchers during the contract's WITHDRAW_DELAY window — this
     * is what prevents a sender rugging a receiver who holds a valid voucher.
     */
    async requestWithdrawal(
        wallet: JustinSigner,
        token: string,
        amount: bigint
    ): Promise<ethers.TransactionResponse> {
        const c = this.getWriteContract(wallet);
        return await c.requestWithdrawal(token, amount);
    }

    /** Cancel a pending withdrawal request before it executes. */
    async cancelWithdrawal(
        wallet: JustinSigner,
        token: string
    ): Promise<ethers.TransactionResponse> {
        const c = this.getWriteContract(wallet);
        return await c.cancelWithdrawal(token);
    }

    /**
     * Step 2 of 2: after the delay has elapsed, pull the funds out. The
     * contract pays min(requested, currentBalance) so claims that landed
     * during the window always take precedence.
     */
    async executeWithdrawal(
        wallet: JustinSigner,
        token: string
    ): Promise<ethers.TransactionResponse> {
        const c = this.getWriteContract(wallet);
        return await c.executeWithdrawal(token);
    }

    /**
     * Inspect a pending withdrawal. `executableAt` is unix seconds (0 = no
     * pending request); `executable` is whether the delay has elapsed.
     */
    async getWithdrawalStatus(
        sender: string,
        token: string
    ): Promise<{ amount: bigint; executableAt: number; executable: boolean }> {
        const c = this.getReadContract();
        const [amount, at] = await Promise.all([
            c.pendingWithdrawal(sender, token),
            c.withdrawableAt(sender, token),
        ]);
        const executableAt = Number(at);
        return {
            amount,
            executableAt,
            executable:
                amount > 0n && executableAt > 0 &&
                Math.floor(Date.now() / 1000) >= executableAt,
        };
    }

    /**
     * Build a signed offline voucher. This is the **offline** operation —
     * it only needs the user's wallet, no RPC, no chain interaction.
     *
     * Returns a VoucherV3 ready to encode for QR/BLE transport.
     */
    async signVoucher(params: {
        wallet: JustinSigner;
        to: string;
        token: string;
        amount: bigint;
        tokenSymbol?: string;
        humanAmount?: string;
        ttlSeconds?: number; // defaults to 24h
    }): Promise<VoucherV3> {
        const { wallet, to, token, amount, tokenSymbol, humanAmount, ttlSeconds = 24 * 60 * 60 } = params;

        if (!ethers.isAddress(to)) throw new Error('Invalid recipient address');
        if (!ethers.isAddress(token)) throw new Error('Invalid token address');
        if (!isAllowlistedToken(token)) throw new Error('Refusing to sign a voucher for an unrecognized token');
        if (amount <= 0n) throw new Error('Amount must be positive');
        // Never sign past the contract's MAX_VOUCHER_TTL — otherwise the
        // claim would revert DeadlineTooFar and the timelock guarantee breaks.
        if (ttlSeconds <= 0 || ttlSeconds > MAX_VOUCHER_TTL_SECONDS) {
            throw new Error(`ttlSeconds must be between 1 and ${MAX_VOUCHER_TTL_SECONDS}`);
        }

        const nonce = ethers.hexlify(ethers.randomBytes(32));
        const deadline = Math.floor(Date.now() / 1000) + ttlSeconds;

        const message = {
            from: wallet.address,
            to,
            token,
            amount: amount.toString(),
            nonce,
            deadline,
        };

        const domain = this.getDomain();
        const signature = await wallet.signTypedData(domain, VOUCHER_TYPES, message);

        return {
            version: 3,
            from: wallet.address,
            to,
            token,
            amount: amount.toString(),
            nonce,
            deadline,
            signature,
            tokenSymbol,
            humanAmount,
            chainId: this.chainId,
            escrowAddress: this.contractAddress!,
        };
    }

    /**
     * Verify a voucher locally (no RPC). Confirms:
     *  - signature matches `voucher.from`
     *  - voucher is for this exact escrow deployment
     *  - voucher hasn't expired
     *  - receiver address matches the expected wallet
     */
    verifyVoucher(voucher: VoucherV3, expectedReceiver: string): { isValid: boolean; error?: string } {
        try {
            if (voucher.version !== 3) {
                return { isValid: false, error: `Unsupported voucher version: ${voucher.version}` };
            }
            if (voucher.to.toLowerCase() !== expectedReceiver.toLowerCase()) {
                return { isValid: false, error: 'Voucher is not for your address' };
            }
            if (voucher.escrowAddress.toLowerCase() !== (this.contractAddress || '').toLowerCase()) {
                return { isValid: false, error: 'Voucher is for a different escrow deployment' };
            }
            if (voucher.chainId !== this.chainId) {
                return { isValid: false, error: 'Voucher is for a different chain' };
            }
            // The token is part of the SIGNED message; its symbol/decimals are
            // not. Reject anything outside the allowlist so a spoofed token
            // address can never be displayed as USDC etc.
            if (!isAllowlistedToken(voucher.token)) {
                return { isValid: false, error: 'Voucher references an unrecognized token' };
            }
            const nowSec = Math.floor(Date.now() / 1000);
            if (voucher.deadline < nowSec) {
                return { isValid: false, error: 'Voucher has expired' };
            }
            if (voucher.deadline > nowSec + MAX_VOUCHER_TTL_SECONDS) {
                return { isValid: false, error: 'Voucher deadline is implausibly far in the future' };
            }

            const domain = this.getDomain();
            const message = {
                from: voucher.from,
                to: voucher.to,
                token: voucher.token,
                amount: voucher.amount,
                nonce: voucher.nonce,
                deadline: voucher.deadline,
            };
            const recovered = ethers.verifyTypedData(domain, VOUCHER_TYPES, message, voucher.signature);
            if (recovered.toLowerCase() !== voucher.from.toLowerCase()) {
                return { isValid: false, error: 'Invalid signature' };
            }

            return { isValid: true };
        } catch (err) {
            return { isValid: false, error: 'Failed to verify: ' + (err as Error).message };
        }
    }

    /**
     * Online-only: ask the chain whether this voucher would currently claim.
     * Useful for the receiver to know "will this work right now, or do I need
     * to wait for the sender to top up?"
     */
    async quoteClaim(voucher: VoucherV3): Promise<{ claimable: boolean; reason: string }> {
        const c = this.getReadContract();
        const [claimable, reason] = await c.quoteClaim(
            voucher.from,
            voucher.to,
            voucher.token,
            voucher.amount,
            voucher.nonce,
            voucher.deadline,
            voucher.signature
        );
        return { claimable, reason };
    }

    /**
     * Online-only: submit the voucher on-chain so the receiver gets paid.
     * Anyone can submit (the receiver typically; a relayer is fine too).
     * Funds always land at voucher.to.
     */
    async claim(
        wallet: JustinSigner,
        voucher: VoucherV3
    ): Promise<ethers.TransactionResponse> {
        const c = this.getWriteContract(wallet);
        return await c.claim(
            voucher.from,
            voucher.to,
            voucher.token,
            voucher.amount,
            voucher.nonce,
            voucher.deadline,
            voucher.signature
        );
    }

    /**
     * Encode for QR/BLE transport. JSON; ~400 bytes typical, fits in a
     * level-H QR at 256x256.
     */
    encodeVoucher(voucher: VoucherV3): string {
        return JSON.stringify(voucher);
    }

    /**
     * Parse and STRICTLY validate an incoming voucher. A QR can carry
     * arbitrary attacker-controlled bytes, so every field is type- and
     * format-checked before any of it is used for crypto or display. Anything
     * malformed throws rather than being silently coerced.
     */
    decodeVoucher(payload: string): VoucherV3 {
        let parsed: any;
        try {
            parsed = JSON.parse(payload);
        } catch {
            throw new Error('Voucher payload is not valid JSON');
        }
        if (typeof parsed !== 'object' || parsed === null) {
            throw new Error('Voucher payload is not an object');
        }
        if (parsed.version !== 3) {
            throw new Error(`Unsupported voucher version: ${parsed.version}`);
        }

        for (const k of ['from', 'to', 'token', 'escrowAddress'] as const) {
            if (typeof parsed[k] !== 'string' || !ethers.isAddress(parsed[k])) {
                throw new Error(`Voucher field "${k}" is not a valid address`);
            }
        }

        if (typeof parsed.amount !== 'string' || !/^[0-9]+$/.test(parsed.amount)) {
            throw new Error('Voucher amount must be a base-unit integer string');
        }
        if (BigInt(parsed.amount) <= 0n) {
            throw new Error('Voucher amount must be positive');
        }

        if (typeof parsed.nonce !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(parsed.nonce)) {
            throw new Error('Voucher nonce must be a 32-byte hex string');
        }
        if (typeof parsed.signature !== 'string' || !/^0x[0-9a-fA-F]+$/.test(parsed.signature)) {
            throw new Error('Voucher signature is malformed');
        }
        if (
            typeof parsed.deadline !== 'number' ||
            !Number.isInteger(parsed.deadline) ||
            parsed.deadline <= 0
        ) {
            throw new Error('Voucher deadline must be a positive integer');
        }
        if (typeof parsed.chainId !== 'number' || !Number.isInteger(parsed.chainId)) {
            throw new Error('Voucher chainId must be an integer');
        }

        return {
            version: 3,
            from: parsed.from,
            to: parsed.to,
            token: parsed.token,
            amount: parsed.amount,
            nonce: parsed.nonce,
            deadline: parsed.deadline,
            signature: parsed.signature,
            // Untrusted display hints — explicitly NOT used for accounting.
            tokenSymbol: typeof parsed.tokenSymbol === 'string' ? parsed.tokenSymbol : undefined,
            humanAmount: typeof parsed.humanAmount === 'string' ? parsed.humanAmount : undefined,
            chainId: parsed.chainId,
            escrowAddress: parsed.escrowAddress,
        };
    }
}

export const escrow = new EscrowService();
