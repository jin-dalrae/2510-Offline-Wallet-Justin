import { useEffect, useState, useRef } from 'react';
import { JustinSigner } from "../lib/signer";
import { QRCodeSVG } from 'qrcode.react';
import { QRScanner } from './QRScanner';
import { VoucherService } from '../lib/voucher';
import { escrow } from '../lib/escrow';
import { storage } from '../lib/storage';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

import {
    blockchain,
    USDC_CONTRACT_ADDRESS,
    CBBTC_CONTRACT_ADDRESS,
    EURC_CONTRACT_ADDRESS,
} from '../lib/blockchain';
import { firebase } from '../lib/firebase';
import { BalanceState } from '../hooks/useBalance';

const TOKEN_ADDRESS: Record<'USDC' | 'EURC' | 'cbBTC', string> = {
    USDC: USDC_CONTRACT_ADDRESS,
    EURC: EURC_CONTRACT_ADDRESS,
    cbBTC: CBBTC_CONTRACT_ADDRESS,
};

// USDC and EURC use 6 decimals; cbBTC uses 8.
const TOKEN_DECIMALS: Record<'USDC' | 'EURC' | 'cbBTC', number> = {
    USDC: 6,
    EURC: 6,
    cbBTC: 8,
};

interface SendOfflineProps {
    wallet: JustinSigner;
    balance: BalanceState;
    isOnline: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function SendOffline({
    wallet,
    balance,
    isOnline,
    onClose,
    onSuccess,
}: SendOfflineProps) {
    const [step, setStep] = useState<
        'amount' | 'scan-address' | 'show-voucher' | 'complete'
    >('amount');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<'USDC' | 'EURC' | 'cbBTC'>('USDC');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [voucherQR, setVoucherQR] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [offlineBudget, setOfflineBudget] = useState<string | null>(null);

    // Cache the user's locked escrow budget across online/offline transitions.
    // Online: query the chain, persist to localStorage.
    // Offline: read the most recent cached value so the amount-entry step can
    //          still show "you have X locked" without an RPC call.
    const budgetCacheKey = `offlineBudget:${wallet.address}:${currency}`;
    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            // Hydrate from cache immediately.
            const cached = localStorage.getItem(budgetCacheKey);
            if (cached && !cancelled) setOfflineBudget(cached);

            // Refresh from chain if online.
            if (!isOnline) return;
            const avail = escrow.isAvailable();
            if (!avail.available) return;

            try {
                const tokenAddress = TOKEN_ADDRESS[currency];
                const decimals = TOKEN_DECIMALS[currency];
                const budget = await escrow.getBudget(wallet.address, tokenAddress);
                const human = ethers.formatUnits(budget, decimals);
                localStorage.setItem(budgetCacheKey, human);
                if (!cancelled) setOfflineBudget(human);
            } catch (e) {
                console.warn('Could not fetch escrow budget:', e);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [isOnline, currency, wallet.address, budgetCacheKey]);

    const getAvailableBalance = () => {
        switch (currency) {
            case 'USDC': return parseFloat(balance.available);
            case 'EURC': return parseFloat(balance.eurcBalance);
            case 'cbBTC': return parseFloat(balance.cbBtcBalance);
            default: return 0;
        }
    };

    const handleAmountNext = () => {
        const amountNum = parseFloat(amount);
        const availableNum = getAvailableBalance();

        if (!amount || amount.trim() === '') {
            setError('Please enter an amount');
            return;
        }
        if (isNaN(amountNum) || amountNum <= 0) {
            setError('Please enter a valid amount');
            return;
        }
        if (amountNum < 0.01) {
            setError(`Minimum amount is 0.01 ${currency}`);
            return;
        }

        // When offline, the spend must fit inside the on-chain escrow budget,
        // which we cached last time we were online. If we don't have a cached
        // value, warn but allow — settlement will reject if budget is short.
        if (!isOnline && offlineBudget !== null) {
            const budgetNum = parseFloat(offlineBudget);
            if (amountNum > budgetNum) {
                setError(
                    `Offline budget too low. ${budgetNum.toFixed(2)} ${currency} available.`
                );
                return;
            }
        }

        if (amountNum > 10000) {
            setError(`Maximum amount is 10,000 ${currency} per transaction`);
            return;
        }

        if (amountNum > availableNum) {
            setError('Insufficient balance');
            return;
        }

        setError('');
        setStep('scan-address');
    };

    const processingRef = useRef(false);

    const handleAddressScanned = (qrData: string) => {
        if (processingRef.current) return;

        try {
            const address = VoucherService.decodeAddress(qrData);

            if (!ethers.isAddress(address)) {
                toast.error('Invalid address scanned');
                return;
            }

            processingRef.current = true;
            setRecipientAddress(address);
            handleSend(address).finally(() => {
                processingRef.current = false;
            });
        } catch (err) {
            toast.error('Failed to decode address: ' + (err as Error).message);
        }
    };

    const handleSend = async (toAddress: string) => {
        setIsLoading(true);

        try {
            const tokenAddress = TOKEN_ADDRESS[currency];
            const decimals = TOKEN_DECIMALS[currency];
            const amountBase = ethers.parseUnits(amount, decimals);

            if (isOnline) {
                // ONLINE: regular ERC20 transfer from wallet -> recipient.
                const hasGas = await blockchain.hasEnoughGas(wallet.address);
                if (!hasGas) throw new Error('Insufficient ETH for gas fees');

                const tx = await blockchain.transferERC20(
                    wallet as any,
                    tokenAddress,
                    toAddress,
                    amount
                );

                const txId = uuidv4();
                const deviceId = storage.getDeviceId();

                await storage.addPendingTransaction({
                    id: txId,
                    type: 'sent',
                    from: wallet.address,
                    to: toAddress,
                    amount,
                    tokenSymbol: currency,
                    timestamp: Date.now(),
                    status: 'pending',
                    txHash: tx.hash,
                    deviceId,
                });

                try {
                    await tx.wait(1);
                    await storage.updatePendingTransaction(txId, { status: 'settled' });
                } catch (waitErr) {
                    console.error('Transaction failed to confirm:', waitErr);
                    await storage.updatePendingTransaction(txId, { status: 'failed' });
                    throw new Error('Transaction was broadcast but failed to confirm');
                }

                try {
                    await firebase.initialize();
                    await firebase.addPendingTransaction({
                        id: txId,
                        from: wallet.address,
                        to: toAddress,
                        amount,
                        status: 'settled',
                        settledTxHash: tx.hash,
                        deviceId,
                    } as any);
                } catch (e) {
                    console.error('Failed to sync online transaction to Firebase:', e);
                }

                toast.success('Transaction sent!');
                handleComplete();
                return;
            }

            // OFFLINE: sign an EIP-712 voucher redeemable against the escrow contract.
            const escrowStatus = escrow.isAvailable();
            if (!escrowStatus.available) {
                throw new Error(
                    'Offline payments require the OfflineEscrow contract to be configured. ' +
                    'Deploy it (npm run contract:deploy) and set VITE_ESCROW_CONTRACT_ADDRESS.'
                );
            }

            // Make sure the sender's escrow budget covers this voucher.
            const budget = await escrow.getBudget(wallet.address, tokenAddress);
            if (budget < amountBase) {
                const human = ethers.formatUnits(budget, decimals);
                throw new Error(
                    `Offline budget too low. You have ${human} ${currency} locked. ` +
                    `Top up your offline budget while online before sending.`
                );
            }

            const voucher = await escrow.signVoucher({
                wallet,
                to: toAddress,
                token: tokenAddress,
                amount: amountBase,
                tokenSymbol: currency,
                humanAmount: amount,
            });

            const qrString = escrow.encodeVoucher(voucher);
            setVoucherQR(qrString);

            const txId = uuidv4();
            const deviceId = storage.getDeviceId();

            await storage.addPendingTransaction({
                id: txId,
                type: 'sent',
                from: wallet.address,
                to: toAddress,
                amount,
                voucher,
                tokenSymbol: currency,
                timestamp: Date.now(),
                status: 'pending',
                deviceId,
            });

            // Local bookkeeping for UI badges.
            const currentBalances = await storage.getOfflineBalances();
            const newSent = parseFloat(currentBalances.sent) + parseFloat(amount);
            await storage.updateOfflineBalances(newSent.toString(), currentBalances.received);

            setStep('show-voucher');
            toast.success('Voucher created!');
        } catch (err) {
            setError((err as Error).message);
            toast.error((err as Error).message || 'Failed to send');
        } finally {
            setIsLoading(false);
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
                    <h3 className="text-2xl font-serif font-bold">{isOnline ? 'Send Money' : 'Send Offline'}</h3>
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
                                    <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-xl">
                                        {(['USDC', 'EURC', 'cbBTC'] as const).map((curr) => (
                                            <button
                                                key={curr}
                                                onClick={() => setCurrency(curr)}
                                                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${currency === curr
                                                    ? 'bg-white text-slate-900 shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-700'
                                                    }`}
                                            >
                                                {curr}
                                            </button>
                                        ))}
                                    </div>

                                    <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                                        Amount ({currency})
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
                                        Available: {getAvailableBalance().toFixed(2)} {currency}
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

                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-200" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white px-2 text-slate-400 font-bold">Or enter wallet address</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="0x..."
                                        className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono focus:border-slate-900 focus:ring-0 outline-none transition-colors"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = (e.target as HTMLInputElement).value;
                                                if (ethers.isAddress(val)) {
                                                    setRecipientAddress(val);
                                                    handleSend(val);
                                                } else {
                                                    toast.error('Invalid address');
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={(e) => {
                                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                            const val = input.value;
                                            if (ethers.isAddress(val)) {
                                                setRecipientAddress(val);
                                                handleSend(val);
                                            } else {
                                                toast.error('Invalid address');
                                            }
                                        }}
                                        className="bg-slate-900 text-white px-4 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                                    >
                                        Go
                                    </button>
                                </div>
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
                                            Sending <span className="text-slate-900 font-bold text-lg">{amount} {currency}</span> to
                                        </p>
                                        <p className="text-sm text-slate-400 font-mono bg-slate-50 py-2 px-4 rounded-full inline-block">
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
