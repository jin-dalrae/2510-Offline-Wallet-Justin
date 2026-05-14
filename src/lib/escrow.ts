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
import { blockchain, BASE_SEPOLIA_CONFIG } from './blockchain';

const ESCROW_ABI = [
    'function balanceOf(address sender, address token) view returns (uint256)',
    'function usedNonce(address sender, bytes32 nonce) view returns (bool)',
    'function deposit(address token, uint256 amount)',
    'function withdraw(address token, uint256 amount)',
    'function claim(address from, address to, address token, uint256 amount, bytes32 nonce, uint256 deadline, bytes signature)',
    'function quoteClaim(address from, address to, address token, uint256 amount, bytes32 nonce, uint256 deadline, bytes signature) view returns (bool claimable, string reason)',
    'function domainSeparator() view returns (bytes32)',
    'event Deposited(address indexed sender, address indexed token, uint256 amount, uint256 newBalance)',
    'event Withdrawn(address indexed sender, address indexed token, uint256 amount, uint256 newBalance)',
    'event Claimed(address indexed from, address indexed to, address indexed token, uint256 amount, bytes32 nonce)',
];

const EIP712_DOMAIN_NAME = 'JustinOfflineEscrow';
const EIP712_DOMAIN_VERSION = '1';

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
    private getWriteContract(wallet: ethers.HDNodeWallet | ethers.Wallet): ethers.Contract {
        if (!this.contractAddress) throw new Error('Escrow not configured');
        const signer = wallet.connect(blockchain.getProvider());
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
        wallet: ethers.HDNodeWallet | ethers.Wallet,
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
            wallet.connect(blockchain.getProvider())
        );
        const current = await tokenContract.allowance(wallet.address, this.contractAddress);
        if (current < amount) {
            const approveTx = await tokenContract.approve(this.contractAddress, amount);
            await approveTx.wait(1);
        }

        const c = this.getWriteContract(wallet);
        return await c.deposit(token, amount);
    }

    /** Pull funds back out of the escrow to the user's wallet. */
    async withdraw(
        wallet: ethers.HDNodeWallet | ethers.Wallet,
        token: string,
        amount: bigint
    ): Promise<ethers.TransactionResponse> {
        const c = this.getWriteContract(wallet);
        return await c.withdraw(token, amount);
    }

    /**
     * Build a signed offline voucher. This is the **offline** operation —
     * it only needs the user's wallet, no RPC, no chain interaction.
     *
     * Returns a VoucherV3 ready to encode for QR/BLE transport.
     */
    async signVoucher(params: {
        wallet: ethers.HDNodeWallet | ethers.Wallet;
        to: string;
        token: string;
        amount: bigint;
        tokenSymbol?: string;
        humanAmount?: string;
        ttlSeconds?: number; // defaults to 24h
    }): Promise<VoucherV3> {
        const { wallet, to, token, amount, tokenSymbol, humanAmount, ttlSeconds = 24 * 60 * 60 } = params;

        if (!ethers.isAddress(to)) throw new Error('Invalid recipient address');
        if (amount <= 0n) throw new Error('Amount must be positive');

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
            if (voucher.deadline < Math.floor(Date.now() / 1000)) {
                return { isValid: false, error: 'Voucher has expired' };
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
        wallet: ethers.HDNodeWallet | ethers.Wallet,
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

    decodeVoucher(payload: string): VoucherV3 {
        let parsed: any;
        try {
            parsed = JSON.parse(payload);
        } catch {
            throw new Error('Voucher payload is not valid JSON');
        }
        const required = ['version', 'from', 'to', 'token', 'amount', 'nonce', 'deadline', 'signature', 'chainId', 'escrowAddress'];
        for (const k of required) {
            if (parsed[k] === undefined || parsed[k] === null) {
                throw new Error(`Voucher missing field: ${k}`);
            }
        }
        if (parsed.version !== 3) {
            throw new Error(`Unsupported voucher version: ${parsed.version}`);
        }
        return parsed as VoucherV3;
    }
}

export const escrow = new EscrowService();
