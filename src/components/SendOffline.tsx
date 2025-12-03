import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QRScanner } from './QRScanner';
import { VoucherService } from '../lib/voucher';
import { storage } from '../lib/storage';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

interface SendOfflineProps {
    wallet: ethers.HDNodeWallet | ethers.Wallet;
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

        // Input validation
        if (!amount || amount.trim() === '') {
            setError('Please enter an amount');
            return;
        }

        if (isNaN(amountNum) || amountNum <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        // Minimum amount validation (0.01 USDC)
        if (amountNum < 0.01) {
            setError('Minimum amount is 0.01 USDC');
            return;
        }

        // Check offline allowance
        const offlineAllowanceData = localStorage.getItem(`offlineAllowance_${wallet.address}`);
        if (offlineAllowanceData) {
            const { limit, spent } = JSON.parse(offlineAllowanceData);
            const availableOffline = limit - spent;
            if (amountNum > availableOffline) {
                setError(`Insufficient offline allowance. Available: $${availableOffline.toFixed(2)}`);
                return;
            }
        }

        // Maximum amount validation (10,000 USDC per transaction)
        if (amountNum > 10000) {
            setError('Maximum amount is 10,000 USDC per transaction');
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

            // Update offline allowance spent
            const offlineAllowanceData = localStorage.getItem(`offlineAllowance_${wallet.address}`);
            if (offlineAllowanceData) {
                const { limit, spent } = JSON.parse(offlineAllowanceData);
                const newSpent = spent + parseFloat(amount);
                localStorage.setItem(
                    `offlineAllowance_${wallet.address}`,
                    JSON.stringify({ limit, spent: newSpent })
                );
                // Notify other components of the change
                window.dispatchEvent(new Event('offlineAllowanceUpdated'));
            }

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
        <div className="fixed inset-0 bg-gradient-to-b from-[#eaff7b] to-[#4bf2e6] z-50 flex items-center justify-center p-4 font-sans text-slate-900">
            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl w-full max-w-md space-y-6 animate-slide-up">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-serif font-bold">Send Offline</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Loading State */}
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4" />
                        <p className="text-slate-500 font-medium">Generating voucher...</p>
                    </div>
                ) : (
                    <>
                        {/* Amount Step */}
                        {step === 'amount' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                                        Amount (USDC)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-slate-900 focus:ring-0 outline-none transition-all font-bold text-3xl placeholder:text-slate-300"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                    <p className="text-sm text-slate-500 mt-2 font-medium ml-1">
                                        Available: {availableBalance} USDC
                                    </p>
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={handleAmountNext}
                                    className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:bg-slate-800 hover:scale-[1.02] transition-all active:scale-95"
                                >
                                    Next: Scan Recipient
                                </button>
                            </div>
                        )}

                        {/* Scan Address Step */}
                        {step === 'scan-address' && (
                            <div className="space-y-4">
                                <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-xl">
                                    <QRScanner
                                        onScan={handleAddressScanned}
                                        onClose={() => setStep('amount')}
                                    />
                                </div>
                                <p className="text-center text-slate-500 text-sm">Scan the recipient's QR code</p>
                            </div>
                        )}

                        {/* Show Voucher Step */}
                        {step === 'show-voucher' && (
                            <div className="space-y-6">
                                <div className="text-center space-y-4">
                                    <p className="text-slate-600 font-medium">Show this QR code to receiver</p>
                                    <div className="bg-white p-6 rounded-3xl shadow-lg inline-block border-2 border-slate-100">
                                        <QRCodeSVG value={voucherQR} size={240} level="H" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">
                                            Sending <span className="text-slate-900 font-bold text-lg">{amount} USDC</span> to
                                        </p>
                                        <p className="text-xs text-slate-400 font-mono bg-slate-50 py-2 px-4 rounded-full inline-block">
                                            {recipientAddress.slice(0, 10)}...{recipientAddress.slice(-8)}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-sm font-medium flex gap-3">
                                    <span className="text-xl">⚠️</span>
                                    Only the intended recipient can claim this voucher
                                </div>

                                <button
                                    onClick={handleComplete}
                                    className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:bg-slate-800 hover:scale-[1.02] transition-all active:scale-95"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
