import { useState } from 'react';
import toast from 'react-hot-toast';
import { CDP_ONRAMP_APP_ID, cdpFaucetUrl, onrampUrl, openCoinbaseUrl } from '../lib/coinbase';

interface LoadMoneyProps {
    onClose: () => void;
    /** Required to direct an Onramp purchase to the user's wallet. */
    walletAddress: string;
}

export function LoadMoney({ onClose, walletAddress }: LoadMoneyProps) {
    const [amount, setAmount] = useState<number>(20);
    const onrampAvailable = !!CDP_ONRAMP_APP_ID;

    const handleBuyWithCard = () => {
        const url = onrampUrl({
            destinationAddress: walletAddress,
            asset: 'USDC',
            network: 'base',
            presetFiatAmountUSD: amount,
            defaultPaymentMethod: 'CARD',
        });
        if (!url) {
            toast.error('Coinbase Onramp is not configured.');
            return;
        }
        openCoinbaseUrl(url);
    };

    const handleFaucet = () => {
        openCoinbaseUrl(cdpFaucetUrl());
    };

    const copyAddress = async () => {
        try {
            await navigator.clipboard.writeText(walletAddress);
            toast.success('Address copied!');
        } catch {
            toast.error('Copy failed');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans text-slate-900">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

            <div className="relative bg-white rounded-[2.5rem] p-8 shadow-2xl w-full max-w-md space-y-6 animate-slide-up border border-slate-100">
                <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-serif font-bold">Add Money</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Buy with card via Coinbase Onramp */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">$</div>
                        <div>
                            <h4 className="font-bold text-slate-900">Buy USDC with card</h4>
                            <p className="text-xs text-slate-500">Powered by Coinbase Onramp · Base network</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2">Amount (USD)</label>
                        <div className="flex gap-2">
                            {[10, 20, 50, 100].map((preset) => (
                                <button
                                    key={preset}
                                    onClick={() => setAmount(preset)}
                                    className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
                                        amount === preset
                                            ? 'bg-blue-600 text-white shadow'
                                            : 'bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    ${preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleBuyWithCard}
                        disabled={!onrampAvailable}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-blue-700 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {onrampAvailable ? `Buy $${amount} USDC` : 'Onramp not configured'}
                    </button>

                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
                        ⚠️ Onramp delivers real USDC to <strong>Base mainnet</strong>. This testnet build will see the purchase but funds won't appear on Sepolia. For testnet funds, use the faucet below.
                    </p>
                </div>

                {/* Testnet faucet */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18l-2 13H5L3 7zm6 4v6m6-6v6M9 7V5a3 3 0 016 0v2" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900">Get free testnet funds</h4>
                            <p className="text-xs text-slate-500">Base Sepolia USDC + ETH from the CDP faucet</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-3 flex items-center gap-2">
                        <code className="text-xs font-mono text-slate-700 flex-1 truncate">{walletAddress}</code>
                        <button
                            onClick={copyAddress}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 whitespace-nowrap"
                        >
                            Copy
                        </button>
                    </div>

                    <button
                        onClick={handleFaucet}
                        className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-md hover:bg-emerald-600 hover:scale-[1.02] transition-all active:scale-95"
                    >
                        Open CDP Faucet
                    </button>

                    <p className="text-xs text-slate-500">
                        Opens the Coinbase Developer Platform faucet. Paste the address above and request USDC + ETH.
                    </p>
                </div>
            </div>
        </div>
    );
}
