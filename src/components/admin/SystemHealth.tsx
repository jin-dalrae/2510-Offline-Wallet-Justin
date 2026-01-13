import { useState, useEffect } from 'react';
import { blockchain, BASE_SEPOLIA_CONFIG } from '../../lib/blockchain';
import { firebase } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface HealthStatus {
    rpc: 'online' | 'degraded' | 'offline';
    firebase: 'online' | 'degraded' | 'offline';
    latency: {
        rpc: number;
        firebase: number;
    };
    lastBlock: number;
    lastBlockTime: number;
    gasPrice: string;
    networkInfo: {
        chainId: number;
        name: string;
    };
}

interface ErrorStats {
    gas: number;
    network: number;
    invalidVoucher: number;
    other: number;
}

export function SystemHealth() {
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorStats, setErrorStats] = useState<ErrorStats>({ gas: 0, network: 0, invalidVoucher: 0, other: 0 });
    const [settlementStats, setSettlementStats] = useState({
        successRate: 0,
        avgTime: 0,
        failed24h: 0,
    });

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const checkHealth = async () => {
        setIsLoading(true);

        // Check RPC
        let rpcStatus: 'online' | 'degraded' | 'offline' = 'offline';
        let rpcLatency = 0;
        let lastBlock = 0;
        let lastBlockTime = 0;
        let gasPrice = '0';

        const rpcStart = performance.now();
        try {
            const provider = blockchain.getProvider();
            const blockNumber = await provider.getBlockNumber();
            const block = await provider.getBlock(blockNumber);
            const feeData = await provider.getFeeData();

            rpcLatency = Math.round(performance.now() - rpcStart);
            lastBlock = blockNumber;
            lastBlockTime = block?.timestamp || 0;
            gasPrice = feeData.gasPrice ? (Number(feeData.gasPrice) / 1e9).toFixed(2) : '0';

            rpcStatus = rpcLatency < 1000 ? 'online' : 'degraded';
        } catch (error) {
            console.error('RPC health check failed:', error);
            rpcStatus = 'offline';
            rpcLatency = -1;
        }

        // Check Firebase
        let firebaseStatus: 'online' | 'degraded' | 'offline' = 'offline';
        let firebaseLatency = 0;

        const fbStart = performance.now();
        try {
            if (firebase.isInitialized()) {
                await firebase.getAllUsers(1);
                firebaseLatency = Math.round(performance.now() - fbStart);
                firebaseStatus = firebaseLatency < 2000 ? 'online' : 'degraded';
            } else {
                firebaseStatus = 'offline';
                firebaseLatency = -1;
            }
        } catch (error) {
            console.error('Firebase health check failed:', error);
            firebaseStatus = 'offline';
            firebaseLatency = -1;
        }

        // Get error stats (mock for now, would come from actual transaction analysis)
        try {
            const txs = await firebase.getAllTransactions(100);
            const failed = txs.filter((tx: any) => tx.status === 'failed');
            const settled = txs.filter((tx: any) => tx.status === 'settled');
            const now = Date.now();
            const last24h = now - 24 * 60 * 60 * 1000;

            const failed24h = failed.filter((tx: any) => tx.timestamp > last24h).length;
            const successRate = txs.length > 0
                ? Math.round((settled.length / txs.length) * 100)
                : 100;

            setSettlementStats({
                successRate,
                avgTime: 5, // Mock average time in minutes
                failed24h,
            });

            // Mock error categorization
            setErrorStats({
                gas: Math.floor(failed.length * 0.3),
                network: Math.floor(failed.length * 0.2),
                invalidVoucher: Math.floor(failed.length * 0.1),
                other: failed.length - Math.floor(failed.length * 0.6),
            });
        } catch (error) {
            console.error('Stats check failed:', error);
        }

        setHealth({
            rpc: rpcStatus,
            firebase: firebaseStatus,
            latency: { rpc: rpcLatency, firebase: firebaseLatency },
            lastBlock,
            lastBlockTime,
            gasPrice,
            networkInfo: {
                chainId: BASE_SEPOLIA_CONFIG.chainId,
                name: BASE_SEPOLIA_CONFIG.name,
            },
        });

        setIsLoading(false);
    };

    const getStatusColor = (status: 'online' | 'degraded' | 'offline') => {
        switch (status) {
            case 'online': return 'bg-emerald-500';
            case 'degraded': return 'bg-amber-500';
            case 'offline': return 'bg-red-500';
        }
    };

    const getStatusBg = (status: 'online' | 'degraded' | 'offline') => {
        switch (status) {
            case 'online': return 'bg-emerald-50 border-emerald-200';
            case 'degraded': return 'bg-amber-50 border-amber-200';
            case 'offline': return 'bg-red-50 border-red-200';
        }
    };

    const getStatusText = (status: 'online' | 'degraded' | 'offline') => {
        switch (status) {
            case 'online': return 'text-emerald-700';
            case 'degraded': return 'text-amber-700';
            case 'offline': return 'text-red-700';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">System Health</h1>
                    <p className="text-slate-500 mt-1">Monitor system status and performance</p>
                </div>
                <button
                    onClick={checkHealth}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    )}
                    Refresh
                </button>
            </div>

            {/* Overall Status */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-6">
                    <div className={`w-4 h-4 rounded-full ${health?.rpc === 'online' && health?.firebase === 'online'
                            ? 'bg-emerald-500'
                            : health?.rpc === 'offline' || health?.firebase === 'offline'
                                ? 'bg-red-500'
                                : 'bg-amber-500'
                        } animate-pulse`} />
                    <h2 className="text-xl font-bold text-slate-900">
                        System is {
                            health?.rpc === 'online' && health?.firebase === 'online'
                                ? 'Operational'
                                : health?.rpc === 'offline' || health?.firebase === 'offline'
                                    ? 'Experiencing Issues'
                                    : 'Degraded'
                        }
                    </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    {/* RPC Status */}
                    <div className={`rounded-xl p-4 border ${getStatusBg(health?.rpc || 'offline')}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${getStatusColor(health?.rpc || 'offline')}`} />
                                <span className="font-semibold text-slate-900">RPC Provider</span>
                            </div>
                            <span className={`text-sm font-medium ${getStatusText(health?.rpc || 'offline')}`}>
                                {health?.rpc?.toUpperCase()}
                            </span>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Latency</span>
                                <span className="font-mono">{health?.latency.rpc}ms</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Latest Block</span>
                                <span className="font-mono">#{health?.lastBlock.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Gas Price</span>
                                <span className="font-mono">{health?.gasPrice} Gwei</span>
                            </div>
                        </div>
                    </div>

                    {/* Firebase Status */}
                    <div className={`rounded-xl p-4 border ${getStatusBg(health?.firebase || 'offline')}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${getStatusColor(health?.firebase || 'offline')}`} />
                                <span className="font-semibold text-slate-900">Firebase</span>
                            </div>
                            <span className={`text-sm font-medium ${getStatusText(health?.firebase || 'offline')}`}>
                                {health?.firebase?.toUpperCase()}
                            </span>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Latency</span>
                                <span className="font-mono">{health?.latency.firebase}ms</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Status</span>
                                <span>{firebase.isInitialized() ? 'Connected' : 'Not Connected'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settlement Performance */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="text-slate-500 text-sm font-medium">Success Rate</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{settlementStats.successRate}%</p>
                    <p className="text-xs text-slate-400 mt-1">All time settlement success</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="text-slate-500 text-sm font-medium">Avg Settlement Time</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{settlementStats.avgTime}m</p>
                    <p className="text-xs text-slate-400 mt-1">Average time to settle</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="text-slate-500 text-sm font-medium">Failed (24h)</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{settlementStats.failed24h}</p>
                    <p className="text-xs text-slate-400 mt-1">Failed transactions today</p>
                </div>
            </div>

            {/* Error Breakdown */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Error Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-slate-50 rounded-xl">
                        <p className="text-2xl font-bold text-orange-600">{errorStats.gas}</p>
                        <p className="text-sm text-slate-500 mt-1">Gas Errors</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-xl">
                        <p className="text-2xl font-bold text-red-600">{errorStats.network}</p>
                        <p className="text-sm text-slate-500 mt-1">Network Errors</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-xl">
                        <p className="text-2xl font-bold text-purple-600">{errorStats.invalidVoucher}</p>
                        <p className="text-sm text-slate-500 mt-1">Invalid Voucher</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-xl">
                        <p className="text-2xl font-bold text-slate-600">{errorStats.other}</p>
                        <p className="text-sm text-slate-500 mt-1">Other</p>
                    </div>
                </div>
            </div>

            {/* Network Info */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Network Configuration</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between py-3 border-b border-slate-100">
                        <span className="text-slate-500">Network</span>
                        <span className="font-medium">{health?.networkInfo.name}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-slate-100">
                        <span className="text-slate-500">Chain ID</span>
                        <span className="font-mono">{health?.networkInfo.chainId}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-slate-100">
                        <span className="text-slate-500">RPC URL</span>
                        <span className="font-mono text-xs">{BASE_SEPOLIA_CONFIG.rpcUrl}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-slate-100">
                        <span className="text-slate-500">Block Explorer</span>
                        <a
                            href={BASE_SEPOLIA_CONFIG.blockExplorer}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            BaseScan Sepolia
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
