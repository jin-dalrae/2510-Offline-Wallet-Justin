import { useState, useEffect, useCallback } from 'react';
import { adminStats } from '../lib/adminStats';
import {
  TransactionStats,
  UserStats,
  FinancialStats,
  SystemHealth,
} from '../types/admin';

export function useAdminStats() {
  const [transactionStats, setTransactionStats] = useState<TransactionStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllStats = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const [txStats, usrStats, finStats, sysHealth] = await Promise.all([
        adminStats.getTransactionStats(refresh),
        adminStats.getUserStats(refresh),
        adminStats.getFinancialStats(refresh),
        adminStats.getSystemHealth(refresh),
      ]);

      setTransactionStats(txStats);
      setUserStats(usrStats);
      setFinancialStats(finStats);
      setSystemHealth(sysHealth);
    } catch (err) {
      setError((err as Error).message);
      console.error('Error loading admin stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllStats();

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      loadAllStats(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadAllStats]);

  const refresh = useCallback(() => {
    loadAllStats(true);
  }, [loadAllStats]);

  return {
    transactionStats,
    userStats,
    financialStats,
    systemHealth,
    loading,
    error,
    refresh,
  };
}
