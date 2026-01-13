import { useState, useEffect } from 'react';
import { firebase } from '../../lib/firebase';
import { adminActions } from '../../lib/adminActions';
import { AuditLogEntry, AuditAction } from '../../types/admin';

const ACTION_LABELS: Record<AuditAction, { label: string; color: string }> = {
    suspend_user: { label: 'Suspend User', color: 'bg-red-100 text-red-700' },
    unsuspend_user: { label: 'Unsuspend User', color: 'bg-emerald-100 text-emerald-700' },
    force_settle: { label: 'Force Settle', color: 'bg-blue-100 text-blue-700' },
    retry_transaction: { label: 'Retry Transaction', color: 'bg-amber-100 text-amber-700' },
    mark_failed: { label: 'Mark Failed', color: 'bg-red-100 text-red-700' },
    admin_login: { label: 'Admin Login', color: 'bg-slate-100 text-slate-700' },
    admin_logout: { label: 'Admin Logout', color: 'bg-slate-100 text-slate-700' },
};

export function AuditLog() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<AuditAction | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setIsLoading(true);
        try {
            const auditLogs = await firebase.getAuditLog(200);
            setLogs(auditLogs as AuditLogEntry[]);
        } catch (error) {
            console.error('Error loading audit logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        // Action filter
        if (filter !== 'all' && log.action !== filter) return false;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                log.id.toLowerCase().includes(query) ||
                log.adminUsername.toLowerCase().includes(query) ||
                log.targetId.toLowerCase().includes(query) ||
                log.action.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const handleExport = () => {
        const exportData = filteredLogs.map(log => ({
            id: log.id,
            timestamp: new Date(log.timestamp).toISOString(),
            admin: log.adminUsername,
            action: log.action,
            targetType: log.targetType,
            targetId: log.targetId,
            details: JSON.stringify(log.details),
        }));
        adminActions.exportToCSV(exportData, 'audit_log');
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const getActionBadge = (action: AuditAction) => {
        const config = ACTION_LABELS[action] || { label: action, color: 'bg-slate-100 text-slate-700' };
        return (
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
                {config.label}
            </span>
        );
    };

    const actionTypes: (AuditAction | 'all')[] = [
        'all',
        'suspend_user',
        'unsuspend_user',
        'force_settle',
        'retry_transaction',
        'mark_failed',
        'admin_login',
        'admin_logout',
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Audit Log</h1>
                    <p className="text-slate-500 mt-1">Track all administrative actions</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadLogs}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        Refresh
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by admin, action, or target..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Action Filter */}
                    <div>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as AuditAction | 'all')}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
                        >
                            {actionTypes.map((action) => (
                                <option key={action} value={action}>
                                    {action === 'all' ? 'All Actions' : ACTION_LABELS[action as AuditAction]?.label || action}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-sm text-slate-500">Total Entries</p>
                    <p className="text-2xl font-bold text-slate-900">{logs.length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-sm text-slate-500">Today</p>
                    <p className="text-2xl font-bold text-blue-600">
                        {logs.filter(l => l.timestamp > Date.now() - 24 * 60 * 60 * 1000).length}
                    </p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-sm text-slate-500">This Week</p>
                    <p className="text-2xl font-bold text-emerald-600">
                        {logs.filter(l => l.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000).length}
                    </p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <p className="text-sm text-slate-500">Unique Admins</p>
                    <p className="text-2xl font-bold text-purple-600">
                        {new Set(logs.map(l => l.adminUsername)).size}
                    </p>
                </div>
            </div>

            {/* Logs Timeline */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p>No audit logs found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredLogs.map((log) => (
                            <div
                                key={log.id}
                                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                                onClick={() => setSelectedLog(log)}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Timeline dot */}
                                    <div className="mt-1">
                                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            {getActionBadge(log.action)}
                                            <span className="text-sm text-slate-500">by</span>
                                            <span className="font-medium text-slate-900">{log.adminUsername}</span>
                                        </div>
                                        <p className="text-sm text-slate-600">
                                            {log.targetType}: <span className="font-mono">{log.targetId.slice(0, 16)}...</span>
                                        </p>
                                        {log.details?.reason && (
                                            <p className="text-sm text-slate-500 mt-1 italic">
                                                "{log.details.reason}"
                                            </p>
                                        )}
                                    </div>

                                    {/* Timestamp */}
                                    <div className="text-right">
                                        <p className="text-sm text-slate-500">{formatDate(log.timestamp)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Log Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
                    <div className="relative bg-white rounded-2xl p-6 shadow-xl w-full max-w-lg space-y-4 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-start">
                            <h3 className="text-xl font-bold text-slate-900">Audit Log Details</h3>
                            <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-slate-100 rounded-full">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">ID</span>
                                <span className="font-mono text-slate-900">{selectedLog.id}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">Timestamp</span>
                                <span className="text-slate-900">{formatDate(selectedLog.timestamp)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">Admin</span>
                                <span className="font-medium text-slate-900">{selectedLog.adminUsername}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">Action</span>
                                {getActionBadge(selectedLog.action)}
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">Target Type</span>
                                <span className="text-slate-900">{selectedLog.targetType}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">Target ID</span>
                                <span className="font-mono text-slate-900 text-xs break-all">{selectedLog.targetId}</span>
                            </div>
                            {selectedLog.ipAddress && (
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">IP Address</span>
                                    <span className="font-mono text-slate-900">{selectedLog.ipAddress}</span>
                                </div>
                            )}
                            {selectedLog.userAgent && (
                                <div className="py-2 border-b border-slate-100">
                                    <span className="text-slate-500 block mb-1">User Agent</span>
                                    <span className="text-xs text-slate-600 break-all">{selectedLog.userAgent}</span>
                                </div>
                            )}
                            {Object.keys(selectedLog.details || {}).length > 0 && (
                                <div className="py-2">
                                    <span className="text-slate-500 block mb-2">Details</span>
                                    <pre className="bg-slate-50 rounded-lg p-3 text-xs overflow-x-auto">
                                        {JSON.stringify(selectedLog.details, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
