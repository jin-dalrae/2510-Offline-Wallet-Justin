import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';

/**
 * Voucher protocol version. v2 adds a `nonce` to the signed payload so that
 * two identical (from, to, amount) vouchers can be distinguished, killing the
 * settlement-match replay risk.
 *
 * v1 vouchers (legacy) lacked `nonce` and `token` in the signed message.
 * They are still accepted on the verify path but new vouchers are always v2.
 */
export const VOUCHER_VERSION = 2;
const VOUCHER_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface CreateVoucherParams {
    fromWallet: ethers.HDNodeWallet | ethers.Wallet;
    toAddress: string;
    amount: string;
    token?: string;
}

export interface VoucherQRData {
    version: number;
    nonce: string;
    amount: string;
    from: string;
    to: string;
    timestamp: number;
    signature: string;
    token: string;
}

/**
 * Build the canonical message that gets signed. Version-aware so v1 vouchers
 * still verify against the original layout.
 */
function buildSignedMessage(v: VoucherQRData): string {
    if (v.version >= 2) {
        return JSON.stringify({
            v: v.version,
            from: v.from,
            to: v.to,
            amount: v.amount,
            token: v.token,
            timestamp: v.timestamp,
            nonce: v.nonce,
        });
    }
    // v1 legacy: original message shape without nonce, with optional token default.
    return JSON.stringify({
        from: v.from,
        to: v.to,
        amount: v.amount,
        timestamp: v.timestamp,
        token: v.token || 'USDC',
        // Legacy v1 also included a tempAddress; not reconstructible here.
        // Legacy vouchers older than that are no longer accepted.
    });
}

export class VoucherService {
    /**
     * Create a new voucher for offline transfer (v2 format).
     * Signature binds: from, to, amount, token, timestamp, nonce.
     * The receiver verifies signature and uses the nonce as a unique settlement key.
     */
    static async createVoucher(params: CreateVoucherParams): Promise<{
        voucherData: VoucherQRData;
    }> {
        const { fromWallet, toAddress, amount, token } = params;

        if (!ethers.isAddress(toAddress)) {
            throw new Error('Invalid recipient address');
        }

        const partial: VoucherQRData = {
            version: VOUCHER_VERSION,
            nonce: uuidv4(),
            amount,
            from: fromWallet.address,
            to: toAddress,
            timestamp: Date.now(),
            token: token || 'USDC',
            signature: '', // filled below
        };

        const message = buildSignedMessage(partial);
        partial.signature = await fromWallet.signMessage(message);

        return { voucherData: partial };
    }

    static encodeVoucher(voucherData: VoucherQRData): string {
        return JSON.stringify(voucherData);
    }

    static decodeVoucher(qrData: string): VoucherQRData {
        let parsed: any;
        try {
            parsed = JSON.parse(qrData);
        } catch (error) {
            throw new Error('Voucher payload is not valid JSON');
        }

        // Required fields for any version
        if (!parsed.version || !parsed.amount || !parsed.from || !parsed.to ||
            !parsed.timestamp || !parsed.signature) {
            throw new Error('Voucher missing required fields');
        }

        // v2 requires nonce; v1 didn't have one — synthesize one from timestamp+from
        // so downstream code (settlement match) has something stable to key on.
        if (parsed.version >= 2 && !parsed.nonce) {
            throw new Error('v2 voucher missing nonce');
        }
        if (parsed.version < 2 && !parsed.nonce) {
            parsed.nonce = `legacy-${parsed.from}-${parsed.timestamp}`;
        }

        parsed.token = parsed.token || 'USDC';
        return parsed as VoucherQRData;
    }

    static async verifyVoucher(
        voucherData: VoucherQRData,
        expectedReceiverAddress: string
    ): Promise<{ isValid: boolean; error?: string }> {
        try {
            if (voucherData.to.toLowerCase() !== expectedReceiverAddress.toLowerCase()) {
                return { isValid: false, error: 'This voucher is not intended for your address' };
            }

            const message = buildSignedMessage(voucherData);
            const recoveredAddress = ethers.verifyMessage(message, voucherData.signature);

            if (recoveredAddress.toLowerCase() !== voucherData.from.toLowerCase()) {
                return { isValid: false, error: 'Invalid voucher signature' };
            }

            if (Date.now() - voucherData.timestamp > VOUCHER_EXPIRY_MS) {
                return { isValid: false, error: 'Voucher has expired' };
            }

            return { isValid: true };
        } catch (error) {
            return {
                isValid: false,
                error: 'Failed to verify voucher: ' + (error as Error).message,
            };
        }
    }

    static encodeAddress(address: string): string {
        return JSON.stringify({ type: 'address', address });
    }

    static decodeAddress(qrData: string): string {
        try {
            const parsed = JSON.parse(qrData);
            if (parsed.type === 'address' && parsed.address) {
                return parsed.address;
            }
        } catch {
            // Fall through to raw address check.
        }
        if (ethers.isAddress(qrData)) return qrData;
        throw new Error('Invalid address QR data');
    }
}
