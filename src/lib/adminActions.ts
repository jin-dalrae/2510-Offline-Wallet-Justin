import { firebase } from './firebase';
import { storage } from './storage';
import toast from 'react-hot-toast';

class AdminActionsService {
  /**
   * Suspend a user account
   */
  async suspendUser(
    userId: string,
    reason: string,
    adminId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await firebase.suspendUser(userId, reason, adminId);
      toast.success(`User ${userId} suspended`);
      return { success: true };
    } catch (error) {
      const errorMsg = (error as Error).message;
      toast.error(`Failed to suspend user: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Unsuspend a user account
   */
  async unsuspendUser(
    userId: string,
    adminId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await firebase.unsuspendUser(userId, adminId);
      toast.success(`User ${userId} unsuspended`);
      return { success: true };
    } catch (error) {
      const errorMsg = (error as Error).message;
      toast.error(`Failed to unsuspend user: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Administratively mark a transaction as settled.
   *
   * NOTE: This does NOT broadcast a chain transaction — admin doesn't hold
   * the sender's signing key. It only updates bookkeeping and records the
   * intervention in the audit log. Use only when the on-chain transfer has
   * actually happened (verifiable on the explorer) but the app failed to
   * detect it (e.g. RPC issues during settlement matching).
   */
  async forceSettlement(
    transactionId: string,
    adminId: string,
    knownTxHash?: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const tx = await storage.getPendingTransaction(transactionId);
      if (!tx) throw new Error('Transaction not found');
      if (tx.status === 'settled') throw new Error('Already settled');

      await storage.updatePendingTransaction(transactionId, {
        status: 'settled',
        ...(knownTxHash && { txHash: knownTxHash }),
      });

      if (knownTxHash) {
        await firebase.markAsSettled(transactionId, knownTxHash);
      } else {
        await firebase.updateTransaction(transactionId, { status: 'settled' });
      }

      await firebase.logAdminAction({
        adminId,
        adminUsername: adminId,
        action: 'force_settle',
        targetType: 'transaction',
        targetId: transactionId,
        details: {
          knownTxHash,
          amount: tx.amount,
          from: tx.from,
          to: tx.to,
          note: 'Admin override; no chain broadcast.',
        },
      });

      toast.success('Transaction marked as settled');
      return { success: true, txHash: knownTxHash };
    } catch (error) {
      const errorMsg = (error as Error).message;
      toast.error(`Failed to settle transaction: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Re-queue a stuck transaction by flipping it back to 'pending', so the
   * normal settlement loop picks it up again. Cannot broadcast directly —
   * admin doesn't have the sender's key.
   */
  async retryTransaction(
    transactionId: string,
    adminId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const tx = await storage.getPendingTransaction(transactionId);
      if (!tx) throw new Error('Transaction not found');
      if (tx.status === 'settled') throw new Error('Transaction already settled');

      await storage.updatePendingTransaction(transactionId, { status: 'pending' });
      await firebase.updateTransaction(transactionId, { status: 'pending' });

      await firebase.logAdminAction({
        adminId,
        adminUsername: adminId,
        action: 'retry_transaction',
        targetType: 'transaction',
        targetId: transactionId,
        details: { amount: tx.amount, note: 'Re-queued for settlement.' },
      });

      toast.success('Transaction re-queued for settlement');
      return { success: true };
    } catch (error) {
      const errorMsg = (error as Error).message;
      toast.error(`Failed to retry transaction: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Mark a transaction as failed
   */
  async markTransactionFailed(
    transactionId: string,
    reason: string,
    adminId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update transaction status
      await storage.updatePendingTransaction(transactionId, {
        status: 'failed',
      });

      // Update Firebase
      await firebase.updateTransaction(transactionId, {
        status: 'failed',
      });

      // Log admin action
      await firebase.logAdminAction({
        adminId,
        adminUsername: adminId,
        action: 'mark_failed',
        targetType: 'transaction',
        targetId: transactionId,
        details: {
          reason,
        },
      });

      toast.success('Transaction marked as failed');
      return { success: true };
    } catch (error) {
      const errorMsg = (error as Error).message;
      toast.error(`Failed to mark transaction: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Export data to CSV
   */
  exportToCSV(data: any[], filename: string): void {
    try {
      if (data.length === 0) {
        toast.error('No data to export');
        return;
      }

      // Get headers from first object
      const headers = Object.keys(data[0]);

      // Convert data to CSV
      const csvRows = [
        headers.join(','), // Header row
        ...data.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              // Escape commas and quotes
              const escaped = String(value).replace(/"/g, '""');
              return `"${escaped}"`;
            })
            .join(',')
        ),
      ];

      const csvString = csvRows.join('\n');

      // Create blob and download
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  }
}

// Singleton instance
export const adminActions = new AdminActionsService();
