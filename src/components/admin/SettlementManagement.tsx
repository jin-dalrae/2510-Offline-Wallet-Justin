import { useState, useEffect } from 'react';
import { firebase } from '../../lib/firebase';
import { adminActions } from '../../lib/adminActions';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import toast from 'react-hot-toast';

interface PendingSettlement {
    id: string;
    from: string;
    to: string;
    amount: string;
    status: 'pending' | 'settled' | 'failed';
    timestamp: number;
    attempts: number;
    lastError?: string;
    voucherAddress?: string;
}

export function SettlementManagement() {
    const { adminUser } = useAdminAuth();
    const [settlements, setSettlements] = useState<PendingSettlement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [stats, setStats] = useState({
        pending: 0,
        totalPendingValue: '0',
        avgWaitTime: 0,
        failureRate: 0,
    });

    useEffect(() => {
        loadSettlements();
    }, []);

    const loadSettlements = async () => {
        setIsLoading(true);
        try {
            const txs = await firebase.getAllTransactions(200);
            const pendingSettlements = txs
                .filter(tx => tx.status === 'pending' || tx.status === 'failed')
                .map(tx => ({
                    id: tx.id,
                    from: tx.from,
                    to: tx.to,
                    amount: tx.amount,
                    status: tx.status,
                    timestamp: tx.timestamp || tx.createdAt,
                    attempts: tx.settlementAttempts || 0,
                    lastError: tx.errorReason,
                    voucherAddress: tx.voucherData?.address,
                }));

            setSettlements(pendingSettlements);

            // Calculate stats
            const pending = pendingSettlements.filter(s => s.status === 'pending');
            const failed = pendingSettlements.filter(s => s.status === 'failed');
            const totalValue = pending.reduce((sum, s) => sum + parseFloat(s.amount || '0'), 0);
            const avgWait = pending.length > 0
                ? pending.reduce((sum, s) => sum + (Date.now() - s.timestamp), 0) / pending.length / 1000 / 60
                : 0;

            setStats({
                pending: pending.length,
                totalPendingValue: totalValue.toFixed(2),
                avgWaitTime: Math.round(avgWait),
                failureRate: pendingSettlements.length > 0
                    ? Math.round((failed.length / pendingSettlements.length) * 100)
                    : 0,
            });
        } catch (error) {
            console.error('Error loading settlements:', error);
            toast.error('Failed to load settlements');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSettleOne = async (settlement: PendingSettlement) => {
        if (!adminUser) return;

        try {
            const result = await adminActions.forceSettlement(settlement.id, adminUser.uid);
            if (result.success) {
                await loadSettlements();
            }
        } catch (error) {
            console.error('Settlement error:', error);
        }
    };

    const handleRetryOne = async (settlement: PendingSettlement) => {
        if (!adminUser) return;

        try {
            const result = await adminActions.retryTransaction(settlement.id, adminUser.uid, true);
            if (result.success) {
                await loadSettlements();
            }
        } catch (error) {
            console.error('Retry error:', error);
        }
    };

    const handleBatchSettle = async () => {
        if (!adminUser || selectedIds.size === 0) return;

        setIsBatchProcessing(true);
        let success = 0;
        let failed = 0;

        for (const id of selectedIds) {
            try {
                const result = await adminActions.forceSettlement(id, adminUser.uid);
                if (result.success) {
                    success++;
                } else {
                    failed++;
                }
            } catch {
                failed++;
            }
        }

        toast.success(`Settled ${success} transactions, ${failed} failed`);
        setSelectedIds(new Set());
        await loadSettlements();
        setIsBatchProcessing(false);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === settlements.filter(s => s.status === 'pending').length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(settlements.filter(s => s.status === 'pending').map(s => s.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const formatAddress = (addr: string) => {
        if (!addr) return '-';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const formatWaitTime = (timestamp: number) => {
        const minutes = Math.floor((Date.now() - timestamp) / 1000 / 60);
        if (minutes < 60) return `${minutes}m`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
        return `${Math.floor(minutes / 1440)}d`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Settlement Management</h1>
                    <p className="text-slate-500 mt-1">Manage pending and failed settlements</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadSettlements}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        Refresh
                    </button>
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBatchSettle}
                            disabled={isBatchProcessing}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                            {isBatchProcessing ? 'Processing...' : `Settle Selected (${selectedIds.size})`}
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-amber-100 text-sm font-medium">Pending</p>
                            <p className="text-3xl font-bold mt-1">{stats.pending}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Pending Value</p>
                            <p className="text-3xl font-bold mt-1">${stats.totalPendingValue}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-300 text-sm font-medium">Avg Wait Time</p>
                            <p className="text-3xl font-bold mt-1">{stats.avgWaitTime}m</p>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-red-100 text-sm font-medium">Failure Rate</p>
                            <p className="text-3xl font-bold mt-1">{stats.failureRate}%</p>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settlements List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : settlements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <svg className="w-16 h-16 mb-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-lg font-medium text-slate-600">All settled!</p>
                        <p className="text-sm">No pending settlements at the moment</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="py-4 px-4 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === settlements.filter(s => s.status === 'pending').length && settlements.filter(s => s.status === 'pending').length > 0}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 rounded border-slate-300"
                                        />
                                    </th>
                                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-600">Transaction</th>
                                    <th className="text-right py-4 px-4 text-sm font-semibold text-slate-600">Amount</th>
                                    <th className="text-center py-4 px-4 text-sm font-semibold text-slate-600">Status</th>
                                    <th className="text-center py-4 px-4 text-sm font-semibold text-slate-600">Wait Time</th>
                                    <th className="text-center py-4 px-4 text-sm font-semibold text-slate-600">Attempts</th>
                                    <th className="text-center py-4 px-4 text-sm font-semibold text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {settlements.map((settlement) => (
                                    <tr key={settlement.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(settlement.id)}
                                                onChange={() => toggleSelect(settlement.id)}
                                                disabled={settlement.status !== 'pending'}
                                                className="w-4 h-4 rounded border-slate-300 disabled:opacity-50"
                                            />
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="text-sm">
                                                <p className="font-mono text-slate-900">{settlement.id.slice(0, 12)}...</p>
                                                <p className="text-slate-400 mt-0.5">
                                                    {formatAddress(settlement.from)} → {formatAddress(settlement.to)}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <span className="font-bold text-slate-900">${settlement.amount}</span>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${settlement.status === 'pending'
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                {settlement.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-center text-sm text-slate-500">
                                            {formatWaitTime(settlement.timestamp)}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className={`font-medium ${settlement.attempts > 2 ? 'text-red-600' : 'text-slate-600'}`}>
                                                {settlement.attempts}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                {settlement.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleSettleOne(settlement)}
                                                        className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors"
                                                    >
                                                        Settle
                                                    </button>
                                                )}
                                                {settlement.status === 'failed' && (
                                                    <button
                                                        onClick={() => handleRetryOne(settlement)}
                                                        className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors"
                                                    >
                                                        Retry
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
