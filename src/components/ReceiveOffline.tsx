import { useState, useRef } from 'react';
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
    const [voucherToken, setVoucherToken] = useState('USDC');
    const [senderAddress, setSenderAddress] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const addressQR = VoucherService.encodeAddress(address);

    const processingRef = useRef(false);
    const lastScannedRef = useRef<string>('');

    const handleVoucherScanned = async (qrData: string) => {
        if (processingRef.current) return;
        // Prevent repeated alerts for the same invalid QR code
        if (qrData === lastScannedRef.current) return;

        processingRef.current = true;
        setIsProcessing(true);
        lastScannedRef.current = qrData;

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
            setVoucherToken(voucherData.token || 'USDC');
            setSenderAddress(voucherData.from);
            setStep('complete');
            toast.success('Voucher received!');
            toast.success('Voucher received!');
        } catch (err) {
            // Only show toast if it's a new error or sufficient time passed?
            // For now, just show it. The dedupe above handles rapid fire of SAME code.
            toast.error('Failed to process voucher: ' + (err as Error).message);
            // If it failed, we MIGHT want to allow scanning again immediately if it was a read error,
            // but if it's an invalid voucher, user needs to scan a different one.
            // Resetting processingRef happens in finally.
            // If we want to allow re-scanning the SAME code (e.g. if it was a glitch), we should clear lastScanned.
            // But usually "limitless alerts" means it keeps reading the same frame.
            // So keeping lastScannedRef.current set to this bad code is correct to stop the loop.
            setStep('show-address');
        } finally {
            setIsProcessing(false);
            processingRef.current = false;
        }
    };

    const handleComplete = () => {
        onSuccess();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans text-slate-900">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative bg-white rounded-[2.5rem] p-8 shadow-2xl w-full max-w-md space-y-6 animate-slide-up">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-serif font-bold">Receive Offline</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Show Address Step */}
                {step === 'show-address' && (
                    <div className="space-y-6">
                        <div className="text-center space-y-4">
                            <p className="text-slate-600 font-medium">1. Show this to sender</p>
                            <div className="bg-white p-6 rounded-3xl shadow-lg inline-block border-2 border-slate-100">
                                <QRCodeSVG value={addressQR} size={240} level="H" />
                            </div>
                            <p className="text-xs text-slate-400 font-mono bg-slate-50 py-2 px-4 rounded-full inline-block">
                                {address}
                            </p>
                        </div>

                        <div className="h-px bg-slate-200" />

                        <button
                            onClick={() => setStep('scan-voucher')}
                            className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:bg-slate-800 hover:scale-[1.02] transition-all active:scale-95"
                        >
                            2. Scan Voucher QR
                        </button>

                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-blue-700 text-sm font-medium flex gap-3">
                            <span className="text-xl">💡</span>
                            First, let sender scan your address. Then scan the voucher they generate.
                        </div>
                    </div>
                )}

                {/* Scan Voucher Step */}
                {step === 'scan-voucher' && (
                    <div className="space-y-4">
                        <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-xl">
                            <QRScanner
                                onScan={handleVoucherScanned}
                                onClose={() => {
                                    lastScannedRef.current = '';
                                    setStep('show-address');
                                }}
                            />
                        </div>
                        <p className="text-center text-slate-500 text-sm">Scan the sender's voucher QR</p>
                    </div>
                )}

                {/* Complete Step */}
                {step === 'complete' && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-small">
                                <svg
                                    className="w-10 h-10 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>

                            <h4 className="text-2xl font-bold text-slate-900 mb-2">
                                Voucher Received!
                            </h4>

                            <div className="my-6">
                                <p className="text-4xl font-bold font-mono text-slate-900">
                                    +{voucherAmount} <span className="text-2xl text-slate-500">{voucherToken}</span>
                                </p>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-4 inline-block">
                                <p className="text-sm text-slate-500 mb-1">From</p>
                                <p className="text-sm text-slate-900 font-mono font-bold">
                                    {senderAddress.slice(0, 10)}...{senderAddress.slice(-8)}
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-sm font-medium flex gap-3">
                            <span className="text-xl">⏳</span>
                            Funds will be settled on-chain when you go online
                        </div>

                        <button
                            onClick={handleComplete}
                            className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:bg-slate-800 hover:scale-[1.02] transition-all active:scale-95"
                        >
                            Done
                        </button>
                    </div>
                )}

                {isProcessing && (
                    <div className="text-center py-12">
                        <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4" />
                        <p className="text-slate-500 font-medium">Processing voucher...</p>
                    </div>
                )}
            </div>
        </div >
    );
}
