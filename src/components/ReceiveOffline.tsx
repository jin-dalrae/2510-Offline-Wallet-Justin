import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QRScanner } from './QRScanner';
import { VoucherService } from '../lib/voucher';
import { storage } from '../lib/storage';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

interface ReceiveOfflineProps {
    address: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function ReceiveOffline({
    address,
    onClose,
    onSuccess,
}: ReceiveOfflineProps) {
    const [step, setStep] = useState<'show-address' | 'scan-voucher' | 'complete'>(
        'show-address'
    );
    const [voucherAmount, setVoucherAmount] = useState('');
    const [senderAddress, setSenderAddress] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const addressQR = VoucherService.encodeAddress(address);

    const handleVoucherScanned = async (qrData: string) => {
        setIsProcessing(true);

        try {
            // Decode voucher
            const voucherData = VoucherService.decodeVoucher(qrData);

            // Verify voucher
            const verification = await VoucherService.verifyVoucher(
                voucherData,
                address
            );

            if (!verification.isValid) {
                toast.error(verification.error || 'Invalid voucher');
                setStep('show-address');
                return;
            }

            // Save pending transaction
            const txId = uuidv4();
            const deviceId = storage.getDeviceId();

            await storage.addPendingTransaction({
                id: txId,
                type: 'received',
                from: voucherData.from,
                to: voucherData.to,
                amount: voucherData.amount,
                voucherData: voucherData,
                timestamp: Date.now(),
                status: 'pending',
                deviceId,
            });

            // Update offline balance
            const currentBalances = await storage.getOfflineBalances();
            const newReceived =
                parseFloat(currentBalances.received) + parseFloat(voucherData.amount);
            await storage.updateOfflineBalances(
                currentBalances.sent,
                newReceived.toString()
            );

            setVoucherAmount(voucherData.amount);
            setSenderAddress(voucherData.from);
            setStep('complete');
            toast.success('Voucher received!');
        } catch (err) {
            toast.error('Failed to process voucher: ' + (err as Error).message);
            setStep('show-address');
        } finally {
            setIsProcessing(false);
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
                    <h3 className="text-xl font-bold">Receive Offline</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Show Address Step */}
                {step === 'show-address' && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <p className="text-gray-400 mb-2">1. Show this to sender</p>
                            <div className="bg-white p-4 rounded-xl inline-block">
                                <QRCodeSVG value={addressQR} size={250} level="H" />
                            </div>
                            <p className="text-xs text-gray-500 mt-4 font-mono">
                                {address}
                            </p>
                        </div>

                        <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />

                        <button
                            onClick={() => setStep('scan-voucher')}
                            className="btn-primary w-full"
                        >
                            2. Scan Voucher QR
                        </button>

                        <div className="p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg text-sm text-gray-300">
                            💡 First, let sender scan your address. Then scan the voucher they generate.
                        </div>
                    </div>
                )}

                {/* Scan Voucher Step */}
                {step === 'scan-voucher' && (
                    <QRScanner
                        onScan={handleVoucherScanned}
                        onClose={() => setStep('show-address')}
                    />
                )}

                {/* Complete Step */}
                {step === 'complete' && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg
                                    className="w-8 h-8 text-green-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>

                            <h4 className="text-2xl font-bold text-green-400 mb-2">
                                Voucher Received!
                            </h4>

                            <p className="text-3xl font-bold my-4">
                                +{voucherAmount} <span className="text-xl">USDC</span>
                            </p>

                            <p className="text-sm text-gray-400">From</p>
                            <p className="text-xs text-gray-500 font-mono">
                                {senderAddress.slice(0, 10)}...{senderAddress.slice(-8)}
                            </p>
                        </div>

                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
                            ⏳ Funds will be settled on-chain when you go online
                        </div>

                        <button onClick={handleComplete} className="btn-primary w-full">
                            Done
                        </button>
                    </div>
                )}

                {isProcessing && (
                    <div className="text-center py-4">
                        <div className="inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-400 mt-2">Processing voucher...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
