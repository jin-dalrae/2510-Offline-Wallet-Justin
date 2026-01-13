import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { agentService, AgentSession, AgentMessage } from '../lib/agentService';
import { X402PaymentRequest } from '../lib/x402';
import { blockchain, USDC_CONTRACT_ADDRESS, EURC_CONTRACT_ADDRESS, CBBTC_CONTRACT_ADDRESS } from '../lib/blockchain';
import toast from 'react-hot-toast';
import { BalanceState } from '../hooks/useBalance';

interface SmartPayUrlProps {
    wallet: ethers.HDNodeWallet | ethers.Wallet;
    balance: BalanceState;
    onClose: () => void;
    onPaymentComplete?: (txHash: string) => void;
}

export function SmartPayUrl({ wallet, balance, onClose, onPaymentComplete }: SmartPayUrlProps) {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [agentAvailable, setAgentAvailable] = useState(false);
    const [useAgent, setUseAgent] = useState(true);

    // Agent state
    const [session, setSession] = useState<AgentSession | null>(null);
    const [messages, setMessages] = useState<AgentMessage[]>([]);

    // Direct mode state (fallback)
    const [paymentRequest, setPaymentRequest] = useState<X402PaymentRequest | null>(null);
    const [content, setContent] = useState<string | null>(null);

    // Check if agent backend is available
    useEffect(() => {
        agentService.isAvailable().then(available => {
            setAgentAvailable(available);
            if (!available) {
                setUseAgent(false);
            }
        });
    }, []);

    const handleCheck = async () => {
        if (!url) return;

        setIsLoading(true);
        setPaymentRequest(null);
        setContent(null);
        setSession(null);
        setMessages([]);

        let targetUrl = url;
        if (!url.startsWith('http')) {
            targetUrl = 'https://' + url;
        }

        try {
            if (useAgent && agentAvailable) {
                // Use AI Agent
                const result = await agentService.startSession(
                    wallet.address,
                    targetUrl,
                    'check_url'
                );

                setSession(result);
                setMessages(result.messages);

                if (result.payment_request) {
                    setPaymentRequest(result.payment_request as X402PaymentRequest);
                }
                if (result.content) {
                    setContent(result.content);
                }
                if (result.error) {
                    toast.error(result.error);
                }
            } else {
                // Direct x402 check using official SDK
                const { createX402Service } = await import('../lib/x402');
                const x402 = createX402Service(wallet);
                const result = await x402.checkUrl(targetUrl);

                if (result.requiresPayment && result.details) {
                    setPaymentRequest(result.details);
                } else if (result.content) {
                    setContent(result.content);
                    toast.success('Page loaded (Free)');
                }
            }
        } catch (error) {
            toast.error('Failed to analyze URL');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };


    const handleNegotiate = async () => {
        if (!session) return;

        setIsLoading(true);
        try {
            const result = await agentService.negotiate(session.session_id);
            setSession(result);
            setMessages(result.messages);
            toast.success('AI analysis complete');
        } catch (error) {
            toast.error('Negotiation failed');
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
            let available = 0;
            if (paymentRequest.token === 'USDC') available = parseFloat(balance.onChain);
            if (paymentRequest.token === 'EURC') available = parseFloat(balance.eurcBalance);
            if (paymentRequest.token === 'cbBTC') available = parseFloat(balance.cbBtcBalance);

            if (parseFloat(paymentRequest.amount) > available) {
                throw new Error(`Insufficient ${paymentRequest.token} balance`);
            }

            // If using agent, approve first
            if (session && useAgent) {
                await agentService.approvePayment(session.session_id);
            }

            // Execute the payment
            let tokenAddress = USDC_CONTRACT_ADDRESS;
            if (paymentRequest.token === 'EURC') tokenAddress = EURC_CONTRACT_ADDRESS;
            if (paymentRequest.token === 'cbBTC') tokenAddress = CBBTC_CONTRACT_ADDRESS;

            const tx = await blockchain.transferERC20(
                wallet as unknown as ethers.Wallet,
                tokenAddress,
                paymentRequest.receiver,
                paymentRequest.amount
            );

            toast.loading('Processing payment...', { id: 'payment' });
            await tx.wait(1);
            toast.dismiss('payment');

            // Confirm with agent
            if (session && useAgent) {
                const confirmed = await agentService.confirmTransaction(session.session_id, tx.hash);
                setSession(confirmed);
                setMessages(confirmed.messages);
            }

            // Fetch the content with payment proof
            const headers = {
                'X-Payment': tx.hash,
                'X-402-Payment-Proof': tx.hash,
                'Authorization': `x402 ${tx.hash}`
            };

            const response = await fetch(paymentRequest.url, { headers });

            if (response.ok) {
                const resultContent = await response.text();
                setContent(resultContent);
                setPaymentRequest(null);
                toast.success('Payment successful! Content unlocked.');
                onPaymentComplete?.(tx.hash);
            } else if (response.status === 402) {
                toast.error('Payment sent but verification pending');
            } else {
                setContent(`Payment complete. Transaction: ${tx.hash}`);
            }

        } catch (error) {
            toast.error((error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const formatAddress = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans text-slate-900">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative bg-white rounded-[2.5rem] p-8 shadow-2xl w-full max-w-lg space-y-6 animate-slide-up max-h-[85vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-serif font-bold">Smart Pay</h3>
                            <p className="text-xs text-slate-500">
                                {agentAvailable ? 'AI-Powered' : 'Direct Mode'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Mode Toggle */}
                {agentAvailable && (
                    <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                        <span className="text-sm text-slate-600">Use AI Agent</span>
                        <button
                            onClick={() => setUseAgent(!useAgent)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${useAgent ? 'bg-violet-500' : 'bg-slate-300'
                                }`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${useAgent ? 'left-7' : 'left-1'
                                }`} />
                        </button>
                    </div>
                )}

                {/* URL Input */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Enter x402-enabled URL..."
                        className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-violet-500 outline-none transition-colors"
                        onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                    />
                    <button
                        onClick={handleCheck}
                        className="bg-slate-900 text-white px-6 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : 'Go'}
                    </button>
                </div>

                {/* Agent Messages */}
                {messages.length > 0 && (
                    <div className="bg-violet-50 rounded-xl p-4 space-y-2 border border-violet-100">
                        <div className="flex items-center gap-2 text-violet-700 text-sm font-medium mb-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            AI Agent
                        </div>
                        {messages.map((msg, i) => (
                            <div key={i} className={`text-sm ${msg.role === 'assistant' ? 'text-violet-800' : 'text-slate-600'
                                }`}>
                                {msg.content}
                            </div>
                        ))}
                    </div>
                )}

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
                                To: {formatAddress(paymentRequest.receiver)}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            {useAgent && agentAvailable && (
                                <button
                                    onClick={handleNegotiate}
                                    disabled={isLoading}
                                    className="flex-1 bg-violet-100 text-violet-700 font-bold py-3 rounded-xl hover:bg-violet-200 transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? 'Analyzing...' : '🤖 Analyze'}
                                </button>
                            )}
                            <button
                                onClick={handlePay}
                                disabled={isLoading}
                                className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-emerald-600 hover:scale-[1.02] transition-all disabled:opacity-50"
                            >
                                {isLoading ? 'Processing...' : 'Pay Now'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Content View */}
                {content && (
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-emerald-600">Content Unlocked</span>
                        </div>
                        <pre className="whitespace-pre-wrap font-mono text-sm overflow-x-auto max-h-64 overflow-y-auto text-slate-700">
                            {content}
                        </pre>
                    </div>
                )}

                {!paymentRequest && !content && !isLoading && messages.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                        </div>
                        <p>Enter a URL to analyze for x402 payments</p>
                        {agentAvailable && (
                            <p className="text-xs mt-2 text-violet-500">AI agent ready to assist</p>
                        )}
                    </div>
                )}

                {/* Loading State */}
                {isLoading && !paymentRequest && (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-slate-500">
                            {useAgent && agentAvailable ? 'AI analyzing URL...' : 'Checking URL...'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
