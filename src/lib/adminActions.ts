import { firebase } from './firebase';
import { storage } from './storage';
import { blockchain } from './blockchain';
import { ethers } from 'ethers';
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
   * Force settlement of a pending transaction
   */
  async forceSettlement(
    transactionId: string,
    adminId: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      // Get transaction details
      const tx = await storage.getPendingTransaction(transactionId);
      if (!tx) {
        throw new Error('Transaction not found');
      }

      if (tx.status !== 'pending') {
        throw new Error('Transaction is not pending');
      }

      if (!tx.voucherData) {
        throw new Error('No voucher data found');
      }

      // Import the voucher wallet
      const voucherWallet = new ethers.Wallet(tx.voucherData.privateKey, blockchain.getProvider());

      // Transfer USDC from voucher wallet to recipient
      const txResponse = await blockchain.transferUSDC(
        voucherWallet,
        tx.to,
        tx.amount
      );

      const txHash = txResponse.hash;

      // Update transaction status
      await storage.updatePendingTransaction(transactionId, {
        status: 'settled',
        txHash,
      });

      // Update Firebase
      await firebase.markAsSettled(transactionId, txHash);

      // Log admin action
      await firebase.logAdminAction({
        adminId,
        adminUsername: adminId,
        action: 'force_settle',
        targetType: 'transaction',
        targetId: transactionId,
        details: {
          txHash,
          amount: tx.amount,
          from: tx.from,
          to: tx.to,
        },
      });

      toast.success('Transaction settled successfully');
      return { success: true, txHash };
    } catch (error) {
      const errorMsg = (error as Error).message;
      toast.error(`Failed to settle transaction: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Retry a failed transaction
   */
  async retryTransaction(
    transactionId: string,
    adminId: string,
    adjustGas = false
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      // Get transaction details
      const tx = await storage.getPendingTransaction(transactionId);
      if (!tx) {
        throw new Error('Transaction not found');
      }

      if (tx.status === 'settled') {
        throw new Error('Transaction already settled');
      }

      if (!tx.voucherData) {
        throw new Error('No voucher data found');
      }

      // Import the voucher wallet
      const voucherWallet = new ethers.Wallet(tx.voucherData.privateKey, blockchain.getProvider());

      // Check if voucher wallet has USDC balance
      const balance = await blockchain.getUSDCBalance(voucherWallet.address);
      if (parseFloat(balance) < parseFloat(tx.amount)) {
        throw new Error('Insufficient voucher balance');
      }

      // Retry with potentially higher gas
      const txResponse = await blockchain.transferUSDC(
        voucherWallet,
        tx.to,
        tx.amount
      );

      const txHash = txResponse.hash;

      // Update transaction status
      await storage.updatePendingTransaction(transactionId, {
        status: 'settled',
        txHash,
      });

      // Update Firebase
      await firebase.markAsSettled(transactionId, txHash);

      // Log admin action
      await firebase.logAdminAction({
        adminId,
        adminUsername: adminId,
        action: 'retry_transaction',
        targetType: 'transaction',
        targetId: transactionId,
        details: {
          txHash,
          adjustedGas: adjustGas,
          amount: tx.amount,
        },
      });

      toast.success('Transaction retried successfully');
      return { success: true, txHash };
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
