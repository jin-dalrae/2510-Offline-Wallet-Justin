import { useState, useEffect } from 'react';
import { firebase } from '../../lib/firebase';
import { adminActions } from '../../lib/adminActions';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import toast from 'react-hot-toast';

interface Transaction {
    id: string;
    type: 'sent' | 'received';
    from: string;
    to: string;
    amount: string;
    status: 'pending' | 'settled' | 'failed';
    timestamp: number;
    txHash?: string;
    deviceId?: string;
}

export function TransactionMonitor() {
    const { adminUser } = useAdminAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'settled' | 'failed'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        setIsLoading(true);
        try {
            const txs = await firebase.getAllTransactions(200);
            setTransactions(txs);
        } catch (error) {
            console.error('Error loading transactions:', error);
            toast.error('Failed to load transactions');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTransactions = transactions.filter(tx => {
        // Status filter
        if (filter !== 'all' && tx.status !== filter) return false;
        
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                tx.id.toLowerCase().includes(query) ||
                tx.from.toLowerCase().includes(query) ||
                tx.to.toLowerCase().includes(query) ||
                tx.txHash?.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const handleForceSettle = async (tx: Transaction) => {
        if (!adminUser) return;
        
        setIsActionLoading(true);
        try {
            const result = await adminActions.forceSettlement(tx.id, adminUser.uid);
            if (result.success) {
                await loadTransactions();
                setSelectedTx(null);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleRetry = async (tx: Transaction) => {
        if (!adminUser) return;
        
        setIsActionLoading(true);
        try {
            const result = await adminActions.retryTransaction(tx.id, adminUser.uid);
            if (result.success) {
                await loadTransactions();
                setSelectedTx(null);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleMarkFailed = async (tx: Transaction) => {
        if (!adminUser) return;
        
        const reason = prompt('Enter reason for marking as failed:');
        if (!reason) return;
        
        setIsActionLoading(true);
        try {
            const result = await adminActions.markTransactionFailed(tx.id, reason, adminUser.uid);
            if (result.success) {
                await loadTransactions();
                setSelectedTx(null);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleExport = () => {
        adminActions.exportToCSV(filteredTransactions, 'transactions');
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-amber-100 text-amber-700 border-amber-200',
            settled: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            failed: 'bg-red-100 text-red-700 border-red-200',
        };
        return styles[status as keyof typeof styles] || 'bg-slate-100 text-slate-700';
    };

    const formatAddress = (addr: string) => {
        if (!addr) return '-';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Transaction Monitor</h1>
                    <p className="text-slate-500 mt-1">Monitor and manage all transactions</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadTransactions}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by ID, address, or tx hash..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                            />
                        </div>
                    </div>
                    
                    {/* Status Filter */}
                    <div className="flex gap-2">
                        {(['all', 'pending', 'settled', 'failed'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                    filter === status
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-sm text-slate-500">Total</p>
                    <p className="text-2xl font-bold text-slate-900">{transactions.length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-sm text-slate-500">Pending</p>
                    <p className="text-2xl font-bold text-amber-600">
                        {transactions.filter(tx => tx.status === 'pending').length}
                    </p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-sm text-slate-500">Settled</p>
                    <p className="text-2xl font-bold text-emerald-600">
                        {transactions.filter(tx => tx.status === 'settled').length}
                    </p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-sm text-slate-500">Failed</p>
                    <p className="text-2xl font-bold text-red-600">
                        {transactions.filter(tx => tx.status === 'failed').length}
                    </p>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p>No transactions found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">ID</th>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">From</th>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">To</th>
                                    <th className="text-right py-4 px-6 text-sm font-semibold text-slate-600">Amount</th>
                                    <th className="text-center py-4 px-6 text-sm font-semibold text-slate-600">Status</th>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Date</th>
                                    <th className="text-center py-4 px-6 text-sm font-semibold text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map((tx) => (
                                    <tr 
                                        key={tx.id} 
                                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                                        onClick={() => setSelectedTx(tx)}
                                    >
                                        <td className="py-4 px-6 font-mono text-sm text-slate-600">
                                            {tx.id.slice(0, 8)}...
                                        </td>
                                        <td className="py-4 px-6 font-mono text-sm text-slate-600">
                                            {formatAddress(tx.from)}
                                        </td>
                                        <td className="py-4 px-6 font-mono text-sm text-slate-600">
                                            {formatAddress(tx.to)}
                                        </td>
                                        <td className="py-4 px-6 text-right font-semibold text-slate-900">
                                            ${tx.amount}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(tx.status)}`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-slate-500">
                                            {formatDate(tx.timestamp)}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            {tx.status === 'pending' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleForceSettle(tx); }}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                >
                                                    Settle
                                                </button>
                                            )}
                                            {tx.status === 'failed' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRetry(tx); }}
                                                    className="text-amber-600 hover:text-amber-800 text-sm font-medium"
                                                >
                                                    Retry
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Transaction Detail Modal */}
            {selectedTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedTx(null)} />
                    <div className="relative bg-white rounded-2xl p-6 shadow-xl w-full max-w-lg space-y-4">
                        <div className="flex justify-between items-start">
                            <h3 className="text-xl font-bold text-slate-900">Transaction Details</h3>
                            <button onClick={() => setSelectedTx(null)} className="p-2 hover:bg-slate-100 rounded-full">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">ID</span>
                                <span className="font-mono text-slate-900">{selectedTx.id}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">From</span>
                                <span className="font-mono text-slate-900">{formatAddress(selectedTx.from)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">To</span>
                                <span className="font-mono text-slate-900">{formatAddress(selectedTx.to)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">Amount</span>
                                <span className="font-bold text-slate-900">${selectedTx.amount} USDC</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">Status</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(selectedTx.status)}`}>
                                    {selectedTx.status}
                                </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">Date</span>
                                <span className="text-slate-900">{formatDate(selectedTx.timestamp)}</span>
                            </div>
                            {selectedTx.txHash && (
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Tx Hash</span>
                                    <a 
                                        href={`https://sepolia.basescan.org/tx/${selectedTx.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-mono text-blue-600 hover:underline"
                                    >
                                        {formatAddress(selectedTx.txHash)}
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            {selectedTx.status === 'pending' && (
                                <>
                                    <button
                                        onClick={() => handleForceSettle(selectedTx)}
                                        disabled={isActionLoading}
                                        className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                    >
                                        {isActionLoading ? 'Processing...' : 'Force Settle'}
                                    </button>
                                    <button
                                        onClick={() => handleMarkFailed(selectedTx)}
                                        disabled={isActionLoading}
                                        className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                                    >
                                        Mark Failed
                                    </button>
                                </>
                            )}
                            {selectedTx.status === 'failed' && (
                                <button
                                    onClick={() => handleRetry(selectedTx)}
                                    disabled={isActionLoading}
                                    className="flex-1 bg-amber-600 text-white py-2.5 rounded-xl font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
                                >
                                    {isActionLoading ? 'Processing...' : 'Retry Transaction'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
