import { ethers } from 'ethers';
import { storage, PendingTransaction } from './storage';
import { blockchain } from './blockchain';
import { firebase } from './firebase';
import { WalletManager } from './wallet';

export interface SettlementResult {
    success: boolean;
    txHash?: string;
    error?: string;
}

export class SettlementService {
    private isSettling: boolean = false;

    /**
     * Settle all pending received transactions
     * This sweeps funds from temporary wallets to the main wallet
     */
    async settlePendingTransactions(
        mainWallet: ethers.Wallet,
        onProgress?: (current: number, total: number, status: string) => void
    ): Promise<SettlementResult[]> {
        if (this.isSettling) {
            return [{ success: false, error: 'Settlement already in progress' }];
        }

        this.isSettling = true;
        const results: SettlementResult[] = [];

        try {
            // Get all pending received transactions
            const pendingTxs = await storage.getPendingTransactions();
            const receivedTxs = pendingTxs.filter(
                (tx) =>
                    tx.type === 'received' &&
                    tx.status === 'pending' &&
                    tx.voucherData
            );

            if (receivedTxs.length === 0) {
                this.isSettling = false;
                return results;
            }

            onProgress?.(0, receivedTxs.length, 'Starting settlement...');

            for (let i = 0; i < receivedTxs.length; i++) {
                const tx = receivedTxs[i];
                onProgress?.(
                    i + 1,
                    receivedTxs.length,
                    `Settling transaction ${i + 1}/${receivedTxs.length}`
                );

                const result = await this.settleTransaction(tx, mainWallet);
                results.push(result);

                // Small delay between transactions
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            // Update offline balances after settlement
            await this.recalculateOfflineBalances();

            onProgress?.(
                receivedTxs.length,
                receivedTxs.length,
                'Settlement complete'
            );
        } catch (error) {
            console.error('Settlement error:', error);
            results.push({
                success: false,
                error: (error as Error).message,
            });
        } finally {
            this.isSettling = false;
        }

        return results;
    }

    /**
     * Settle a single transaction
     */
    private async settleTransaction(
        tx: PendingTransaction,
        mainWallet: ethers.Wallet
    ): Promise<SettlementResult> {
        try {
            if (!tx.voucherData) {
                return { success: false, error: 'No voucher data' };
            }

            // Import temporary wallet
            const tempWallet = WalletManager.fromPrivateKey(
                tx.voucherData.privateKey
            );

            // Check if temp wallet has funds
            const balance = await blockchain.getUSDCBalance(tempWallet.address);
            const balanceNum = parseFloat(balance);

            if (balanceNum <= 0) {
                // Mark as failed - no funds
                await storage.updatePendingTransaction(tx.id, {
                    status: 'failed',
                });

                return {
                    success: false,
                    error: 'Temporary wallet has no funds',
                };
            }

            // Check if temp wallet has enough ETH for gas
            const hasGas = await blockchain.hasEnoughGas(tempWallet.address);
            if (!hasGas) {
                return {
                    success: false,
                    error: 'Temporary wallet has insufficient gas',
                };
            }

            // Sweep USDC to main wallet
            const txResponse = await blockchain.sweepUSDC(
                tempWallet,
                mainWallet.address
            );

            if (!txResponse) {
                return { success: false, error: 'Failed to sweep funds' };
            }

            // Wait for confirmation
            const receipt = await txResponse.wait();

            if (receipt?.status === 1) {
                // Update local storage
                await storage.updatePendingTransaction(tx.id, {
                    status: 'settled',
                    txHash: txResponse.hash,
                });

                // Update Firebase
                try {
                    await firebase.markAsSettled(tx.id, txResponse.hash);
                } catch (e) {
                    console.warn('Failed to update Firebase:', e);
                }

                return {
                    success: true,
                    txHash: txResponse.hash,
                };
            } else {
                await storage.updatePendingTransaction(tx.id, {
                    status: 'failed',
                });

                return {
                    success: false,
                    error: 'Transaction failed on-chain',
                };
            }
        } catch (error) {
            console.error('Error settling transaction:', error);

            // Mark as failed
            await storage.updatePendingTransaction(tx.id, {
                status: 'failed',
            });

            return {
                success: false,
                error: (error as Error).message,
            };
        }
    }

    /**
     * Recalculate offline balances based on pending transactions
     */
    private async recalculateOfflineBalances(): Promise<void> {
        const pendingTxs = await storage.getPendingTransactions();

        let sentTotal = 0;
        let receivedTotal = 0;

        for (const tx of pendingTxs) {
            if (tx.status !== 'pending') continue;

            const amount = parseFloat(tx.amount);

            if (tx.type === 'sent') {
                sentTotal += amount;
            } else if (tx.type === 'received') {
                receivedTotal += amount;
            }
        }

        await storage.updateOfflineBalances(
            sentTotal.toString(),
            receivedTotal.toString()
        );
    }

    /**
     * Sync with Firebase to check settlement status
     */
    async syncWithFirebase(address: string): Promise<void> {
        if (!firebase.isInitialized()) return;

        try {
            const firestoreTxs = await firebase.getPendingTransactions(address);
            const localTxs = await storage.getPendingTransactions();

            // Update local transactions based on Firestore data
            for (const firestoreTx of firestoreTxs) {
                const localTx = localTxs.find((tx) => tx.id === firestoreTx.id);

                if (localTx && localTx.status !== firestoreTx.status) {
                    // Update local status
                    await storage.updatePendingTransaction(firestoreTx.id, {
                        status: firestoreTx.status as 'pending' | 'settled' | 'failed',
                        txHash: firestoreTx.settledTxHash,
                    });
                }
            }

            // Recalculate balances
            await this.recalculateOfflineBalances();
        } catch (error) {
            console.error('Error syncing with Firebase:', error);
        }
    }

    /**
     * Check if settlement is in progress
     */
    isInProgress(): boolean {
        return this.isSettling;
    }
}

// Singleton instance
export const settlement = new SettlementService();
