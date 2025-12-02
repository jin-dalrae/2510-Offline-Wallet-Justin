import { firebase } from './firebase';
import { blockchain } from './blockchain';
import { storage } from './storage';
import {
  TransactionStats,
  UserStats,
  FinancialStats,
  SystemHealth,
  CachedData,
} from '../types/admin';

class AdminStatsService {
  private cache: Map<string, CachedData<any>> = new Map();
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  // Cache TTL in milliseconds
  private readonly CACHE_TTL = {
    transactionStats: 5 * 60 * 1000, // 5 minutes
    userStats: 5 * 60 * 1000, // 5 minutes
    financialStats: 2 * 60 * 1000, // 2 minutes
    systemHealth: 1 * 60 * 1000, // 1 minute
  };

  /**
   * Get cached data or fetch new data
   */
  private async getCached<T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>,
    refresh = false
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (!refresh && cached && cached.expiresAt > now) {
      return cached.data as T;
    }

    const data = await fetchFn();
    this.cache.set(key, {
      data,
      expiresAt: now + ttl,
    });

    // Notify subscribers
    this.notifySubscribers(key, data);

    return data;
  }

  /**
   * Notify all subscribers for a given key
   */
  private notifySubscribers(key: string, data: any): void {
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach((callback) => callback(data));
    }
  }

  /**
   * Subscribe to data updates
   */
  private subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
      }
    };
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(refresh = false): Promise<TransactionStats> {
    return this.getCached(
      'transactionStats',
      this.CACHE_TTL.transactionStats,
      async () => {
        try {
          const allTxs = await firebase.getAllTransactions(1000);

          const now = Date.now();
          const last24h = now - 24 * 60 * 60 * 1000;
          const last7d = now - 7 * 24 * 60 * 60 * 1000;
          const last30d = now - 30 * 24 * 60 * 60 * 1000;

          // Filter by time periods
          const txsLast24h = allTxs.filter((tx) => tx.timestamp >= last24h);
          const txsLast7d = allTxs.filter((tx) => tx.timestamp >= last7d);
          const txsLast30d = allTxs.filter((tx) => tx.timestamp >= last30d);

          // Count by status
          const byStatus = {
            pending: allTxs.filter((tx) => tx.status === 'pending').length,
            settled: allTxs.filter((tx) => tx.status === 'settled').length,
            failed: allTxs.filter((tx) => tx.status === 'failed').length,
          };

          // Calculate volumes
          const calculateVolume = (txs: any[]) =>
            txs
              .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0)
              .toFixed(2);

          const volumeUSDC = {
            total: calculateVolume(allTxs),
            last24h: calculateVolume(txsLast24h),
            last7d: calculateVolume(txsLast7d),
            last30d: calculateVolume(txsLast30d),
          };

          // Generate trend data (last 30 days)
          const trendData = this.generateTrendData(txsLast30d);

          return {
            total: allTxs.length,
            last24h: txsLast24h.length,
            last7d: txsLast7d.length,
            last30d: txsLast30d.length,
            byStatus,
            volumeUSDC,
            trendData,
          };
        } catch (error) {
          console.error('Error getting transaction stats:', error);
          return this.getEmptyTransactionStats();
        }
      },
      refresh
    );
  }

  /**
   * Get user statistics
   */
  async getUserStats(refresh = false): Promise<UserStats> {
    return this.getCached(
      'userStats',
      this.CACHE_TTL.userStats,
      async () => {
        try {
          const allUsers = await firebase.getAllUsers(1000);
          const allTxs = await firebase.getAllTransactions(1000);

          const now = Date.now();
          const today = now - 24 * 60 * 60 * 1000;
          const last7d = now - 7 * 24 * 60 * 60 * 1000;
          const last30d = now - 30 * 24 * 60 * 60 * 1000;

          // Count new users
          const newToday = allUsers.filter((u) => u.createdAt >= today).length;
          const newLast7d = allUsers.filter((u) => u.createdAt >= last7d).length;
          const newLast30d = allUsers.filter((u) => u.createdAt >= last30d).length;

          // Count active users (users with transactions in period)
          const activeAddresses7d = new Set(
            allTxs
              .filter((tx) => tx.timestamp >= last7d)
              .flatMap((tx) => [tx.from, tx.to])
          );
          const activeAddresses30d = new Set(
            allTxs
              .filter((tx) => tx.timestamp >= last30d)
              .flatMap((tx) => [tx.from, tx.to])
          );

          // Generate growth trend (last 30 days)
          const growthTrend = this.generateUserGrowthTrend(allUsers);

          return {
            totalUsers: allUsers.length,
            newToday,
            newLast7d,
            newLast30d,
            activeUsers7d: activeAddresses7d.size,
            activeUsers30d: activeAddresses30d.size,
            growthTrend,
          };
        } catch (error) {
          console.error('Error getting user stats:', error);
          return this.getEmptyUserStats();
        }
      },
      refresh
    );
  }

  /**
   * Get financial statistics
   */
  async getFinancialStats(refresh = false): Promise<FinancialStats> {
    return this.getCached(
      'financialStats',
      this.CACHE_TTL.financialStats,
      async () => {
        try {
          const allTxs = await firebase.getAllTransactions(1000);

          // Calculate TVL (simplified - in production, query blockchain for actual balances)
          let totalValueLocked = '0';
          try {
            // This is a placeholder - in production you'd batch query balances
            totalValueLocked = '0'; // Would sum all user balances
          } catch (error) {
            console.error('Error calculating TVL:', error);
          }

          // Calculate transaction amounts
          const amounts = allTxs
            .map((tx) => parseFloat(tx.amount || '0'))
            .filter((amt) => amt > 0)
            .sort((a, b) => a - b);

          const avgTransactionAmount =
            amounts.length > 0
              ? (amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length).toFixed(2)
              : '0';

          const medianTransactionAmount =
            amounts.length > 0
              ? amounts[Math.floor(amounts.length / 2)].toFixed(2)
              : '0';

          // Get offline balances from local storage (simplified)
          const offlineBalances = await storage.getOfflineBalances();

          // Calculate pending USDC
          const pendingTxs = allTxs.filter((tx) => tx.status === 'pending');
          const pendingSent = pendingTxs
            .filter((tx) => tx.from)
            .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0)
            .toFixed(2);
          const pendingReceived = pendingTxs
            .filter((tx) => tx.to)
            .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0)
            .toFixed(2);

          return {
            totalValueLocked,
            avgTransactionAmount,
            medianTransactionAmount,
            offlineAllowanceTotal: '0', // Would sum all users' offline limits
            offlineSpentTotal: offlineBalances.sent,
            pendingUSDC: {
              sent: pendingSent,
              received: pendingReceived,
            },
          };
        } catch (error) {
          console.error('Error getting financial stats:', error);
          return this.getEmptyFinancialStats();
        }
      },
      refresh
    );
  }

  /**
   * Get system health statistics
   */
  async getSystemHealth(refresh = false): Promise<SystemHealth> {
    return this.getCached(
      'systemHealth',
      this.CACHE_TTL.systemHealth,
      async () => {
        try {
          const allTxs = await firebase.getAllTransactions(500);
          const now = Date.now();
          const last24h = now - 24 * 60 * 60 * 1000;

          // Settlement metrics
          const settledTxs = allTxs.filter((tx) => tx.status === 'settled');
          const settlementSuccessRate =
            allTxs.length > 0
              ? ((settledTxs.length / allTxs.length) * 100).toFixed(1)
              : '0';

          // Average settlement time (simplified)
          const avgSettlementTime = 5000; // 5 seconds placeholder

          // Failed transactions in last 24h
          const failedTransactions24h = allTxs.filter(
            (tx) => tx.status === 'failed' && tx.timestamp >= last24h
          ).length;

          // Error categorization (simplified - would need error logs)
          const errorsByType = {
            gas: 0,
            network: 0,
            invalidVoucher: 0,
            other: failedTransactions24h,
          };

          // Check RPC status
          let rpcStatus: 'online' | 'degraded' | 'offline' = 'online';
          let lastBlockNumber = 0;
          let lastBlockTime = 0;
          try {
            const provider = blockchain.getProvider();
            const blockNumber = await provider.getBlockNumber();
            const block = await provider.getBlock(blockNumber);
            lastBlockNumber = blockNumber;
            lastBlockTime = block?.timestamp || 0;
          } catch (error) {
            rpcStatus = 'offline';
          }

          // Check Firebase status
          const firebaseStatus = firebase.isInitialized() ? 'online' : 'offline';

          return {
            settlementSuccessRate: parseFloat(settlementSuccessRate),
            avgSettlementTime,
            failedTransactions24h,
            errorsByType,
            rpcStatus,
            firebaseStatus,
            lastBlockNumber,
            lastBlockTime,
          };
        } catch (error) {
          console.error('Error getting system health:', error);
          return this.getEmptySystemHealth();
        }
      },
      refresh
    );
  }

  /**
   * Subscribe to transaction stats updates
   */
  subscribeToTransactions(callback: (stats: TransactionStats) => void): () => void {
    return this.subscribe('transactionStats', callback);
  }

  /**
   * Subscribe to system health updates
   */
  subscribeToSystemHealth(callback: (health: SystemHealth) => void): () => void {
    return this.subscribe('systemHealth', callback);
  }

  /**
   * Generate trend data for last 30 days
   */
  private generateTrendData(txs: any[]): Array<{ date: string; count: number; volume: string }> {
    const trendMap = new Map<string, { count: number; volume: number }>();
    const now = new Date();

    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      trendMap.set(dateKey, { count: 0, volume: 0 });
    }

    // Populate with actual data
    txs.forEach((tx) => {
      const date = new Date(tx.timestamp).toISOString().split('T')[0];
      const existing = trendMap.get(date);
      if (existing) {
        existing.count++;
        existing.volume += parseFloat(tx.amount || '0');
      }
    });

    // Convert to array
    return Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      volume: data.volume.toFixed(2),
    }));
  }

  /**
   * Generate user growth trend for last 30 days
   */
  private generateUserGrowthTrend(users: any[]): Array<{
    date: string;
    newUsers: number;
    totalUsers: number;
  }> {
    const trendMap = new Map<string, number>();
    const now = new Date();

    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      trendMap.set(dateKey, 0);
    }

    // Count new users per day
    users.forEach((user) => {
      const date = new Date(user.createdAt).toISOString().split('T')[0];
      const existing = trendMap.get(date);
      if (existing !== undefined) {
        trendMap.set(date, existing + 1);
      }
    });

    // Convert to array with running total
    let runningTotal = 0;
    return Array.from(trendMap.entries()).map(([date, newUsers]) => {
      runningTotal += newUsers;
      return {
        date,
        newUsers,
        totalUsers: runningTotal,
      };
    });
  }

  // Empty state helpers
  private getEmptyTransactionStats(): TransactionStats {
    return {
      total: 0,
      last24h: 0,
      last7d: 0,
      last30d: 0,
      byStatus: { pending: 0, settled: 0, failed: 0 },
      volumeUSDC: { total: '0', last24h: '0', last7d: '0', last30d: '0' },
      trendData: [],
    };
  }

  private getEmptyUserStats(): UserStats {
    return {
      totalUsers: 0,
      newToday: 0,
      newLast7d: 0,
      newLast30d: 0,
      activeUsers7d: 0,
      activeUsers30d: 0,
      growthTrend: [],
    };
  }

  private getEmptyFinancialStats(): FinancialStats {
    return {
      totalValueLocked: '0',
      avgTransactionAmount: '0',
      medianTransactionAmount: '0',
      offlineAllowanceTotal: '0',
      offlineSpentTotal: '0',
      pendingUSDC: { sent: '0', received: '0' },
    };
  }

  private getEmptySystemHealth(): SystemHealth {
    return {
      settlementSuccessRate: 0,
      avgSettlementTime: 0,
      failedTransactions24h: 0,
      errorsByType: { gas: 0, network: 0, invalidVoucher: 0, other: 0 },
      rpcStatus: 'offline',
      firebaseStatus: 'offline',
      lastBlockNumber: 0,
      lastBlockTime: 0,
    };
  }
}

// Singleton instance
export const adminStats = new AdminStatsService();
