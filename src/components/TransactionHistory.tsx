import { useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import { blockchain } from '../lib/blockchain';

interface TransactionHistoryProps {
    address: string;
    isOnline: boolean;
    onClose: () => void;
}

interface DisplayTransaction {
    id: string;
    type: 'sent' | 'received';
    from: string;
    to: string;
    amount: string;
    timestamp: number;
    status: 'pending' | 'settled' | 'failed';
    txHash?: string;
    source: 'local' | 'chain';
}

export function TransactionHistory({
    address,
    isOnline,
    onClose,
}: TransactionHistoryProps) {
    const [transactions, setTransactions] = useState<DisplayTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadTransactions();
    }, [address, isOnline]);

    const loadTransactions = async () => {
        setIsLoading(true);

        try {
            // Get local pending transactions
            const pendingTxs = await storage.getPendingTransactions();
            const localTxs: DisplayTransaction[] = pendingTxs.map((tx) => ({
                id: tx.id,
                type: tx.type,
                from: tx.from,
                to: tx.to,
                amount: tx.amount,
                timestamp: tx.timestamp,
                status: tx.status,
                txHash: tx.txHash,
                source: 'local',
            }));

            let chainTxs: DisplayTransaction[] = [];

            // Get on-chain transactions if online
            if (isOnline) {
                try {
                    const recentTxs = await blockchain.getRecentTransactions(address, 20);
                    chainTxs = recentTxs.map((tx) => ({
                        id: tx.hash,
                        type: tx.type as 'sent' | 'received',
                        from: tx.from,
                        to: tx.to,
                        amount: tx.amount,
                        timestamp: tx.timestamp * 1000,
                        status: 'settled' as const,
                        txHash: tx.hash,
                        source: 'chain',
                    }));
                } catch (error) {
                    console.error('Error loading chain transactions:', error);
                }
            }

            // Combine and deduplicate
            const allTxs = [...localTxs, ...chainTxs];
            const uniqueTxs = Array.from(
                new Map(
                    allTxs.map((tx) => [tx.txHash || tx.id, tx])
                ).values()
            );

            // Sort by timestamp
            uniqueTxs.sort((a, b) => b.timestamp - a.timestamp);

            setTransactions(uniqueTxs);
        } catch (error) {
            console.error('Error loading transactions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };


    const getStatusText = (status: string) => {
        switch (status) {
            case 'settled':
                return 'Settled';
            case 'pending':
                return 'Pending';
            case 'failed':
                return 'Failed';
            default:
                return status;
        }
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-[#eaff7b] to-[#4bf2e6] z-50 flex items-center justify-center p-4 font-sans text-slate-900">
            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-slide-up">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-serif font-bold">Transaction History</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Transaction List */}
                <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4" />
                            <p className="text-slate-500 font-medium">Loading transactions...</p>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                            <p className="text-slate-400 font-medium">No transactions yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="bg-white hover:bg-slate-50 p-5 rounded-2xl transition-all shadow-sm border border-slate-100 group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span
                                                    className={`font-bold text-sm px-2 py-1 rounded-lg ${tx.type === 'received'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                        }`}
                                                >
                                                    {tx.type === 'received' ? '↓ Received' : '↑ Sent'}
                                                </span>
                                                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${tx.status === 'settled' ? 'bg-slate-100 text-slate-600' :
                                                    tx.status === 'pending' ? 'bg-blue-50 text-blue-600' :
                                                        'bg-red-50 text-red-600'
                                                    }`}>
                                                    {getStatusText(tx.status)}
                                                </span>
                                            </div>

                                            <p className="text-sm text-slate-500 mt-2">
                                                {tx.type === 'received' ? 'From' : 'To'}:{' '}
                                                <span className="font-mono font-bold text-slate-700">
                                                    {formatAddress(
                                                        tx.type === 'received' ? tx.from : tx.to
                                                    )}
                                                </span>
                                            </p>

                                            <p className="text-xs text-slate-400 mt-1 font-medium">
                                                {formatDate(tx.timestamp)}
                                            </p>

                                            {tx.txHash && (
                                                <a
                                                    href={`https://sepolia.basescan.org/tx/${tx.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-slate-400 hover:text-slate-900 hover:underline mt-2 inline-flex items-center gap-1 transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    View on Explorer
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                            )}
                                        </div>

                                        <div className="text-right">
                                            <p
                                                className={`text-xl font-bold font-mono ${tx.type === 'received'
                                                    ? 'text-green-600'
                                                    : 'text-slate-900'
                                                    }`}
                                            >
                                                {tx.type === 'received' ? '+' : '-'}
                                                {tx.amount}
                                            </p>
                                            <p className="text-xs text-slate-400 font-bold">USDC</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
