import { useAdminStats } from '../../hooks/useAdminStats';
import { TransactionTrendChart } from './charts/TransactionTrendChart';
import { StatusPieChart } from './charts/StatusPieChart';
import { UserGrowthChart } from './charts/UserGrowthChart';

export function AdminOverview() {
  const {
    transactionStats,
    userStats,
    financialStats,
    systemHealth,
    loading,
    error,
    refresh,
  } = useAdminStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin mb-4" />
          <p className="text-slate-600 font-medium">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <p className="text-red-600 font-medium">Error loading statistics: {error}</p>
        <button
          onClick={refresh}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard Overview</h1>
          <p className="text-slate-600">Real-time statistics and system monitoring</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Total Users</h3>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{userStats?.totalUsers || 0}</p>
          <p className="text-sm text-slate-500 mt-1">
            +{userStats?.newLast7d || 0} this week
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Total Transactions</h3>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{transactionStats?.total || 0}</p>
          <p className="text-sm text-slate-500 mt-1">
            ${transactionStats?.volumeUSDC.total || '0'} USDC total
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Total Value Locked</h3>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            ${financialStats?.totalValueLocked || '0'}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Avg: ${financialStats?.avgTransactionAmount || '0'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Settlement Rate</h3>
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {systemHealth?.settlementSuccessRate.toFixed(1) || 0}%
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {systemHealth?.failedTransactions24h || 0} failed (24h)
          </p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Trends */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Transaction Trends (30 days)</h3>
          {transactionStats && transactionStats.trendData.length > 0 ? (
            <TransactionTrendChart data={transactionStats.trendData} />
          ) : (
            <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl">
              <p className="text-slate-400">No transaction data available</p>
            </div>
          )}
        </div>

        {/* Transaction Status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Transaction Status</h3>
          {transactionStats ? (
            <StatusPieChart data={transactionStats.byStatus} />
          ) : (
            <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl">
              <p className="text-slate-400">No status data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-4">User Growth (30 days)</h3>
          {userStats && userStats.growthTrend.length > 0 ? (
            <UserGrowthChart data={userStats.growthTrend} />
          ) : (
            <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl">
              <p className="text-slate-400">No user data available</p>
            </div>
          )}
        </div>

        {/* System Health */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-slate-600">RPC Status</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  systemHealth?.rpcStatus === 'online'
                    ? 'bg-green-100 text-green-700'
                    : systemHealth?.rpcStatus === 'degraded'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {systemHealth?.rpcStatus || 'Unknown'}
              </span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-slate-600">Firebase Status</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  systemHealth?.firebaseStatus === 'online'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {systemHealth?.firebaseStatus || 'Unknown'}
              </span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-slate-600">Last Block</span>
              <span className="text-slate-900 font-mono text-sm">
                #{systemHealth?.lastBlockNumber || 0}
              </span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-slate-600">Avg Settlement Time</span>
              <span className="text-slate-900 font-medium">
                {((systemHealth?.avgSettlementTime || 0) / 1000).toFixed(1)}s
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="text-slate-600">Failed (24h)</span>
              <span className="text-red-600 font-bold">
                {systemHealth?.failedTransactions24h || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Financial Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-slate-600 mb-1">Avg Transaction</p>
            <p className="text-2xl font-bold text-slate-900">
              ${financialStats?.avgTransactionAmount || '0'}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Median Transaction</p>
            <p className="text-2xl font-bold text-slate-900">
              ${financialStats?.medianTransactionAmount || '0'}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Pending Sent</p>
            <p className="text-2xl font-bold text-amber-600">
              ${financialStats?.pendingUSDC.sent || '0'}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Pending Received</p>
            <p className="text-2xl font-bold text-green-600">
              ${financialStats?.pendingUSDC.received || '0'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
