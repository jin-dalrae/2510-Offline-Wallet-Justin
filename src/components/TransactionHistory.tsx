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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'settled':
                return 'text-green-400';
            case 'pending':
                return 'text-amber-400';
            case 'failed':
                return 'text-red-400';
            default:
                return 'text-gray-400';
        }
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="card max-w-2xl w-full max-h-[80vh] flex flex-col animate-slide-up">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Transaction History</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Transaction List */}
                <div className="overflow-y-auto flex-1">
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-gray-400 mt-2">Loading transactions...</p>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-400">No transactions yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="glass-hover p-4 rounded-xl cursor-pointer"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span
                                                    className={`font-semibold ${tx.type === 'received'
                                                        ? 'text-green-400'
                                                        : 'text-amber-400'
                                                        }`}
                                                >
                                                    {tx.type === 'received' ? '↓ Received' : '↑ Sent'}
                                                </span>
                                                <span className={`text-xs ${getStatusColor(tx.status)}`}>
                                                    {getStatusText(tx.status)}
                                                </span>
                                            </div>

                                            <p className="text-sm text-gray-400">
                                                {tx.type === 'received' ? 'From' : 'To'}:{' '}
                                                <span className="font-mono">
                                                    {formatAddress(
                                                        tx.type === 'received' ? tx.from : tx.to
                                                    )}
                                                </span>
                                            </p>

                                            <p className="text-xs text-gray-500 mt-1">
                                                {formatDate(tx.timestamp)}
                                            </p>

                                            {tx.txHash && (
                                                <a
                                                    href={`https://sepolia.basescan.org/tx/${tx.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-primary-400 hover:underline mt-1 inline-block"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    View on Explorer ↗
                                                </a>
                                            )}
                                        </div>

                                        <div className="text-right">
                                            <p
                                                className={`text-lg font-bold ${tx.type === 'received'
                                                    ? 'text-green-400'
                                                    : 'text-white'
                                                    }`}
                                            >
                                                {tx.type === 'received' ? '+' : '-'}
                                                {tx.amount}
                                            </p>
                                            <p className="text-xs text-gray-500">USDC</p>
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
