/**
 * Address-QR utilities.
 *
 * NOTE: the voucher protocol itself now lives in src/lib/escrow.ts as
 * VoucherV3 — signed EIP-712 messages redeemable against the on-chain
 * OfflineEscrow contract. The old v1/v2 IOU-style vouchers have been
 * retired; the trust model fundamentally changed when escrow landed.
 *
 * This file is retained only for the "receiver shows their address as a
 * QR" flow, which has nothing to do with the voucher protocol.
 */

import { ethers } from 'ethers';

export class VoucherService {
    /** Encode a receiver's wallet address as a QR-friendly JSON payload. */
    static encodeAddress(address: string): string {
        return JSON.stringify({ type: 'address', address });
    }

    /**
     * Decode either a JSON-wrapped address QR (our format) or a raw 0x address.
     */
    static decodeAddress(qrData: string): string {
        try {
            const parsed = JSON.parse(qrData);
            if (parsed.type === 'address' && parsed.address) {
                return parsed.address;
            }
        } catch {
            // Not JSON — fall through to raw address check.
        }
        if (ethers.isAddress(qrData)) return qrData;
        throw new Error('Invalid address QR data');
    }
}
