import { useState } from 'react';
import { ethers } from 'ethers';
import { createX402Service, X402PaymentRequest } from '../lib/x402';
import toast from 'react-hot-toast';
import { BalanceState } from '../hooks/useBalance';

interface PayUrlProps {
    wallet: ethers.HDNodeWallet | ethers.Wallet;
    balance: BalanceState;
    onClose: () => void;
}

export function PayUrl({ wallet, balance, onClose }: PayUrlProps) {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [paymentRequest, setPaymentRequest] = useState<X402PaymentRequest | null>(null);
    const [content, setContent] = useState<string | null>(null);

    const handleCheck = async () => {
        if (!url) return;

        setIsLoading(true);
        setPaymentRequest(null);
        setContent(null);

        try {
            // Basic validation
            let targetUrl = url;
            if (!url.startsWith('http')) {
                targetUrl = 'https://' + url;
            }

            const x402 = createX402Service(wallet);
            const result = await x402.checkUrl(targetUrl);

            if (result.requiresPayment && result.details) {
                setPaymentRequest(result.details);
            } else if (result.content) {
                setContent(result.content);
                toast.success('Page loaded (Free)');
            }
        } catch (error) {
            toast.error('Failed to load URL');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePay = async () => {
        if (!paymentRequest) return;

        setIsLoading(true);
        try {
            // Check balance
            // Simple check assuming USDC/EURC. 
            // Ideally use dynamic balance check based on token symbol.
            let available = 0;
            if (paymentRequest.token === 'USDC') available = parseFloat(balance.onChain);
            if (paymentRequest.token === 'EURC') available = parseFloat(balance.eurcBalance);
            if (paymentRequest.token === 'cbBTC') available = parseFloat(balance.cbBtcBalance);
            // Fallback for available (offline balances not relevant for x402 usually)

            if (parseFloat(paymentRequest.amount) > available) {
                throw new Error(`Insufficient ${paymentRequest.token} balance`);
            }

            const x402 = createX402Service(wallet);
            const result = await x402.payAndFetch(paymentRequest.url);
            setContent(result);
            setPaymentRequest(null);
            toast.success('Payment successful! Content unlocked.');
        } catch (error) {
            toast.error((error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans text-slate-900">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative bg-white rounded-[2.5rem] p-8 shadow-2xl w-full max-w-lg space-y-6 animate-slide-up max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-serif font-bold">x402 Browser</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* URL Input */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Enter x402 enabled URL..."
                        className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-900 outline-none transition-colors"
                        onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                    />
                    <button
                        onClick={handleCheck}
                        className="bg-slate-900 text-white px-6 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                        disabled={isLoading}
                    >
                        {isLoading ? '...' : 'Go'}
                    </button>
                </div>

                {/* Payment Prompt */}
                {paymentRequest && (
                    <div className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg">Payment Required</h4>
                                <p className="text-sm text-slate-500">{paymentRequest.realm}</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <p className="text-3xl font-mono font-bold text-slate-900">
                                {paymentRequest.amount} <span className="text-lg text-slate-500">{paymentRequest.token}</span>
                            </p>
                            <p className="text-xs text-slate-400 font-mono mt-1 break-all">
                                To: {paymentRequest.receiver}
                            </p>
                        </div>

                        <button
                            onClick={handlePay}
                            disabled={isLoading}
                            className="w-full bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-600 hover:scale-[1.02] transition-all"
                        >
                            {isLoading ? 'Processing...' : 'Approve Payment'}
                        </button>
                    </div>
                )}

                {/* Content View */}
                {content && (
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 prose prose-slate max-w-none">
                        <pre className="whitespace-pre-wrap font-mono text-sm overflow-x-auto">
                            {content}
                        </pre>
                    </div>
                )}

                {!paymentRequest && !content && !isLoading && (
                    <div className="text-center py-8 text-slate-400">
                        <p>Enter a URL to browse x402-gated content.</p>
                        <p className="text-xs mt-2 opacity-70">Supports WWW-Authenticate headers</p>
                    </div>
                )}
            </div>
        </div>
    );
}
