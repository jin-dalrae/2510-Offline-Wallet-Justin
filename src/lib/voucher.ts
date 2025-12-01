import { ethers } from 'ethers';
import { WalletManager } from './wallet';

export interface CreateVoucherParams {
    fromWallet: ethers.HDNodeWallet | ethers.Wallet;
    toAddress: string;
    amount: string;
}

export interface VoucherQRData {
    version: number;
    privateKey: string;
    amount: string;
    from: string;
    to: string;
    timestamp: number;
    signature: string;
}

export class VoucherService {
    /**
     * Create a new voucher for offline transfer
     * This generates a temporary wallet funded with the specified amount
     */
    static async createVoucher(params: CreateVoucherParams): Promise<{
        voucherData: VoucherQRData;
        temporaryWallet: ethers.HDNodeWallet;
    }> {
        const { fromWallet, toAddress, amount } = params;

        // Generate temporary wallet for the voucher
        const { wallet: tempWallet } = WalletManager.createWallet();

        // Create voucher data
        const timestamp = Date.now();
        const voucherData: Omit<VoucherQRData, 'signature'> = {
            version: 1,
            privateKey: tempWallet.privateKey,
            amount,
            from: fromWallet.address,
            to: toAddress,
            timestamp,
        };

        // Sign the voucher with the sender's wallet to prove authenticity
        const message = JSON.stringify({
            from: voucherData.from,
            to: voucherData.to,
            amount: voucherData.amount,
            timestamp: voucherData.timestamp,
            tempAddress: tempWallet.address,
        });

        const signature = await fromWallet.signMessage(message);

        const completeVoucherData: VoucherQRData = {
            ...voucherData,
            signature,
        };

        return {
            voucherData: completeVoucherData,
            temporaryWallet: tempWallet,
        };
    }

    /**
     * Encode voucher data to QR-compatible string
     */
    static encodeVoucher(voucherData: VoucherQRData): string {
        return JSON.stringify(voucherData);
    }

    /**
     * Decode voucher from QR string
     */
    static decodeVoucher(qrData: string): VoucherQRData {
        try {
            const parsed = JSON.parse(qrData);

            // Validate required fields
            if (
                !parsed.version ||
                !parsed.privateKey ||
                !parsed.amount ||
                !parsed.from ||
                !parsed.to ||
                !parsed.timestamp ||
                !parsed.signature
            ) {
                throw new Error('Invalid voucher data: missing required fields');
            }

            return parsed as VoucherQRData;
        } catch (error) {
            throw new Error('Failed to decode voucher: ' + (error as Error).message);
        }
    }

    /**
     * Verify voucher signature
     */
    static async verifyVoucher(
        voucherData: VoucherQRData,
        expectedReceiverAddress: string
    ): Promise<{
        isValid: boolean;
        error?: string;
    }> {
        try {
            // Check if receiver matches
            if (voucherData.to.toLowerCase() !== expectedReceiverAddress.toLowerCase()) {
                return {
                    isValid: false,
                    error: 'This voucher is not intended for your address',
                };
            }

            // Verify signature
            const tempWallet = WalletManager.fromPrivateKey(voucherData.privateKey);
            const message = JSON.stringify({
                from: voucherData.from,
                to: voucherData.to,
                amount: voucherData.amount,
                timestamp: voucherData.timestamp,
                tempAddress: tempWallet.address,
            });

            const recoveredAddress = ethers.verifyMessage(message, voucherData.signature);

            if (recoveredAddress.toLowerCase() !== voucherData.from.toLowerCase()) {
                return {
                    isValid: false,
                    error: 'Invalid voucher signature',
                };
            }

            // Check timestamp (vouchers expire after 7 days)
            const now = Date.now();
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            if (now - voucherData.timestamp > sevenDays) {
                return {
                    isValid: false,
                    error: 'Voucher has expired',
                };
            }

            return { isValid: true };
        } catch (error) {
            return {
                isValid: false,
                error: 'Failed to verify voucher: ' + (error as Error).message,
            };
        }
    }

    /**
     * Redeem voucher (import temporary wallet)
     */
    static redeemVoucher(voucherData: VoucherQRData): ethers.Wallet {
        return WalletManager.fromPrivateKey(voucherData.privateKey);
    }

    /**
     * Generate address QR data for receiving
     */
    static encodeAddress(address: string): string {
        return JSON.stringify({
            type: 'address',
            address,
        });
    }

    /**
     * Decode address from QR data
     */
    static decodeAddress(qrData: string): string {
        try {
            const parsed = JSON.parse(qrData);

            if (parsed.type === 'address' && parsed.address) {
                return parsed.address;
            }

            // Also support raw address strings
            if (ethers.isAddress(qrData)) {
                return qrData;
            }

            throw new Error('Invalid address QR data');
        } catch (error) {
            // Try as raw address
            if (ethers.isAddress(qrData)) {
                return qrData;
            }
            throw new Error('Failed to decode address: ' + (error as Error).message);
        }
    }
}
