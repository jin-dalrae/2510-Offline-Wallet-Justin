// Admin Dashboard Type Definitions

export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type AdminPermission =
  | 'view_stats'
  | 'force_settle'
  | 'suspend_user'
  | 'retry_transaction'
  | 'view_audit_log';

export interface UserDocument {
  id: string;
  username: string;
  encryptedWallet: string;
  accountName: string;
  createdAt: number;
  role: UserRole;
  permissions: AdminPermission[];
  status: UserStatus;
  suspendedAt?: number;
  suspendedBy?: string;
  suspensionReason?: string;
}

export interface AdminSession {
  uid: string;
  username: string;
  role: 'admin';
  loginTime: number;
  expiresAt: number;
  ipAddress?: string;
}

// Statistics Types

export interface TransactionStats {
  total: number;
  last24h: number;
  last7d: number;
  last30d: number;
  byStatus: {
    pending: number;
    settled: number;
    failed: number;
  };
  volumeUSDC: {
    total: string;
    last24h: string;
    last7d: string;
    last30d: string;
  };
  trendData: Array<{
    date: string;
    count: number;
    volume: string;
  }>;
}

export interface UserStats {
  totalUsers: number;
  newToday: number;
  newLast7d: number;
  newLast30d: number;
  activeUsers7d: number;
  activeUsers30d: number;
  growthTrend: Array<{
    date: string;
    newUsers: number;
    totalUsers: number;
  }>;
}

export interface FinancialStats {
  totalValueLocked: string;
  avgTransactionAmount: string;
  medianTransactionAmount: string;
  offlineAllowanceTotal: string;
  offlineSpentTotal: string;
  pendingUSDC: {
    sent: string;
    received: string;
  };
}

export type SystemStatus = 'online' | 'degraded' | 'offline';

export interface SystemHealth {
  settlementSuccessRate: number;
  avgSettlementTime: number;
  failedTransactions24h: number;
  errorsByType: {
    gas: number;
    network: number;
    invalidVoucher: number;
    other: number;
  };
  rpcStatus: SystemStatus;
  firebaseStatus: SystemStatus;
  lastBlockNumber: number;
  lastBlockTime: number;
}

// Audit Log Types

export type AuditAction =
  | 'suspend_user'
  | 'unsuspend_user'
  | 'force_settle'
  | 'retry_transaction'
  | 'mark_failed'
  | 'admin_login'
  | 'admin_logout';

export type AuditTargetType = 'user' | 'transaction' | 'system';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  adminId: string;
  adminUsername: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  details: {
    reason?: string;
    previousState?: any;
    newState?: any;
    [key: string]: any;
  };
  ipAddress?: string;
  userAgent?: string;
}

// User Management Types

export interface UserListItem {
  id: string;
  username: string;
  accountName: string;
  address: string;
  balance: string;
  transactionCount: number;
  createdAt: number;
  lastActivity?: number;
  status: UserStatus;
  role: UserRole;
}

export interface UserDetails extends UserListItem {
  encryptedWallet: string;
  permissions: AdminPermission[];
  suspendedAt?: number;
  suspendedBy?: string;
  suspensionReason?: string;
  devices: string[];
  offlineAllowance?: {
    limit: number;
    spent: number;
  };
}

// Transaction Types for Admin

export interface AdminTransactionItem {
  id: string;
  type: 'sent' | 'received';
  from: string;
  to: string;
  amount: string;
  status: 'pending' | 'settled' | 'failed';
  timestamp: number;
  txHash?: string;
  deviceId: string;
  userId?: string;
  username?: string;
  errorReason?: string;
  settlementAttempts?: number;
}

// Admin Action Handlers

export interface ForceSettlementRequest {
  transactionId: string;
  adminId: string;
  reason?: string;
}

export interface SuspendUserRequest {
  userId: string;
  reason: string;
  adminId: string;
}

export interface RetryTransactionRequest {
  transactionId: string;
  adminId: string;
  adjustGas?: boolean;
}

// Cache Types

export interface CachedData<T> {
  data: T;
  expiresAt: number;
}

export type CacheKey =
  | 'transaction_stats'
  | 'user_stats'
  | 'financial_stats'
  | 'system_health';
