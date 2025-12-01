import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QRScanner } from './QRScanner';
import { VoucherService } from '../lib/voucher';
import { storage } from '../lib/storage';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

interface SendOfflineProps {
    wallet: ethers.Wallet;
    availableBalance: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function SendOffline({
    wallet,
    availableBalance,
    onClose,
    onSuccess,
}: SendOfflineProps) {
    const [step, setStep] = useState<
        'amount' | 'scan-address' | 'show-voucher' | 'complete'
    >('amount');
    const [amount, setAmount] = useState('');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [voucherQR, setVoucherQR] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAmountNext = () => {
        const amountNum = parseFloat(amount);
        const availableNum = parseFloat(availableBalance);

        if (isNaN(amountNum) || amountNum <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (amountNum > availableNum) {
            setError('Insufficient balance');
            return;
        }

        setError('');
        setStep('scan-address');
    };

    const handleAddressScanned = (qrData: string) => {
        try {
            const address = VoucherService.decodeAddress(qrData);

            if (!ethers.isAddress(address)) {
                toast.error('Invalid address scanned');
                return;
            }

            setRecipientAddress(address);
            generateVoucher(address);
        } catch (err) {
            toast.error('Failed to decode address: ' + (err as Error).message);
        }
    };

    const generateVoucher = async (toAddress: string) => {
        setIsLoading(true);

        try {
            // Create voucher
            const { voucherData } = await VoucherService.createVoucher({
                fromWallet: wallet,
                toAddress,
                amount,
            });

            // Encode for QR
            const qrString = VoucherService.encodeVoucher(voucherData);
            setVoucherQR(qrString);

            // Save pending transaction locally
            const txId = uuidv4();
            const deviceId = storage.getDeviceId();

            await storage.addPendingTransaction({
                id: txId,
                type: 'sent',
                from: wallet.address,
                to: toAddress,
                amount,
                voucherData: voucherData,
                timestamp: Date.now(),
                status: 'pending',
                deviceId,
            });

            // Update offline balance
            const currentBalances = await storage.getOfflineBalances();
            const newSent =
                parseFloat(currentBalances.sent) + parseFloat(amount);
            await storage.updateOfflineBalances(
                newSent.toString(),
                currentBalances.received
            );

            setStep('show-voucher');
            toast.success('Voucher created!');
        } catch (err) {
            setError((err as Error).message);
            toast.error('Failed to create voucher');
        } finally {
            setIsLoading(false);
        }
    };

    const handleComplete = () => {
        onSuccess();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="card max-w-md w-full space-y-4 animate-slide-up">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Send Offline</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Amount Step */}
                {step === 'amount' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Amount (USDC)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="input-field text-2xl"
                                placeholder="0.00"
                                autoFocus
                            />
                            <p className="text-sm text-gray-400 mt-2">
                                Available: {availableBalance} USDC
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <button onClick={handleAmountNext} className="btn-primary w-full">
                            Next: Scan Recipient
                        </button>
                    </div>
                )}

                {/* Scan Address Step */}
                {step === 'scan-address' && (
                    <QRScanner
                        onScan={handleAddressScanned}
                        onClose={() => setStep('amount')}
                    />
                )}

                {/* Show Voucher Step */}
                {step === 'show-voucher' && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <p className="text-gray-400 mb-2">Show this QR code to receiver</p>
                            <div className="bg-white p-4 rounded-xl inline-block">
                                <QRCodeSVG value={voucherQR} size={250} level="H" />
                            </div>
                            <p className="text-sm text-gray-400 mt-4">
                                Sending <span className="text-white font-semibold">{amount} USDC</span> to
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                                {recipientAddress.slice(0, 10)}...{recipientAddress.slice(-8)}
                            </p>
                        </div>

                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
                            ⚠️ Only the intended recipient can claim this voucher
                        </div>

                        <button onClick={handleComplete} className="btn-primary w-full">
                            Done
                        </button>
                    </div>
                )}

                {isLoading && (
                    <div className="text-center py-4">
                        <div className="inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-400 mt-2">Generating voucher...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
