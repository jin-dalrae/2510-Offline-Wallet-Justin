import { ethers } from 'ethers';
import { storage, PendingTransaction } from './storage';
import {
    blockchain,
    USDC_CONTRACT_ADDRESS,
    CBBTC_CONTRACT_ADDRESS,
    EURC_CONTRACT_ADDRESS
} from './blockchain';
import { firebase } from './firebase';

export interface SettlementResult {
    success: boolean;
    txHash?: string;
    error?: string;
    retries?: number;
}

async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class SettlementService {
    private isSettling: boolean = false;

    /**
     * Settle all pending received transactions
     * This sweeps funds from temporary wallets to the main wallet
     */
    /**
     * Settle all pending transactions (sent and received)
     */
    async settlePendingTransactions(
        mainWallet: ethers.HDNodeWallet | ethers.Wallet,
        onProgress?: (current: number, total: number, status: string) => void
    ): Promise<SettlementResult[]> {
        if (this.isSettling) {
            return [{ success: false, error: 'Settlement already in progress' }];
        }

        this.isSettling = true;
        const results: SettlementResult[] = [];

        try {
            // Get all pending transactions
            const allPending = await storage.getPendingTransactions();
            const pendingTxs = allPending.filter(tx => tx.status === 'pending');

            if (pendingTxs.length === 0) {
                this.isSettling = false;
                return results;
            }

            onProgress?.(0, pendingTxs.length, 'Starting settlement...');

            for (let i = 0; i < pendingTxs.length; i++) {
                const tx = pendingTxs[i];
                onProgress?.(
                    i + 1,
                    pendingTxs.length,
                    `Settling ${tx.type} transaction ${i + 1}/${pendingTxs.length}`
                );

                let result: SettlementResult;
                if (tx.type === 'sent') {
                    result = await this.settleSentTransaction(tx, mainWallet);
                } else {
                    result = await this.settleReceivedTransaction(tx, mainWallet);
                }

                results.push(result);

                // Small delay to prevent rate limits
                if (result.success) {
                    await delay(1000);
                }
            }

            // Update offline balances after settlement
            await this.recalculateOfflineBalances();

            onProgress?.(
                pendingTxs.length,
                pendingTxs.length,
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
     * Settle a 'sent' transaction by broadcasting it to the blockchain
     */
    private async settleSentTransaction(
        tx: PendingTransaction,
        wallet: ethers.HDNodeWallet | ethers.Wallet
    ): Promise<SettlementResult> {
        try {
            // Determine token address
            let tokenAddress = '';
            const symbol = tx.voucherData?.token || 'USDC';

            if (symbol === 'EURC') tokenAddress = EURC_CONTRACT_ADDRESS;
            else if (symbol === 'cbBTC') tokenAddress = CBBTC_CONTRACT_ADDRESS;
            else tokenAddress = USDC_CONTRACT_ADDRESS;

            // Check if we have gas
            const hasGas = await blockchain.hasEnoughGas(wallet.address);
            if (!hasGas) {
                return { success: false, error: 'Insufficient ETH for gas' };
            }

            // Broadcast transaction
            const txResponse = await blockchain.transferERC20(
                wallet as any,
                tokenAddress,
                tx.to,
                tx.amount
            );

            // Wait/Confirm? Just broadcast is enough to mark 'settled' locally, 
            // but waiting ensures valid hash.
            await txResponse.wait(1);

            // Update storage
            await storage.updatePendingTransaction(tx.id, {
                status: 'settled',
                txHash: txResponse.hash,
            });

            // Update Firebase
            await firebase.initialize();
            await firebase.addPendingTransaction({
                ...tx,
                status: 'settled',
                settledTxHash: txResponse.hash,
            } as any);

            return { success: true, txHash: txResponse.hash };

        } catch (error) {
            console.error('Failed to settle sent transaction:', error);

            // If it fails permanently (e.g. insufficient funds), mark failed?
            // Or keep pending to retry?
            // For now, if generic error, keep pending.
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Settle a 'received' transaction by verifying it on-chain
     */
    private async settleReceivedTransaction(
        tx: PendingTransaction,
        mainWallet: ethers.HDNodeWallet | ethers.Wallet
    ): Promise<SettlementResult> {
        try {
            if (!tx.from || !tx.amount) {
                return { success: false, error: 'Invalid transaction data' };
            }

            // Determine token address
            let tokenAddress = '';
            const symbol = tx.voucherData?.token || 'USDC';
            if (symbol === 'EURC') tokenAddress = EURC_CONTRACT_ADDRESS;
            else if (symbol === 'cbBTC') tokenAddress = CBBTC_CONTRACT_ADDRESS;
            else tokenAddress = USDC_CONTRACT_ADDRESS;

            // Look for matching on-chain transaction
            // We search for recent transactions to 'me' from 'sender'
            const recentTxs = await blockchain.getRecentERC20Transactions(
                tokenAddress,
                mainWallet.address,
                20 // Check last 20
            );

            // Match logic: Same sender, same amount, roughly same time?
            // Local timestamp might differ from chain timestamp considerably if queued.
            // So mostly match From and Amount.
            // Also ensure it's not already linked to another local tx? 
            // (Deduplication prevents double counting in UI, but here we want to link status)

            const match = recentTxs.find(chainTx =>
                chainTx.type === 'received' &&
                chainTx.from.toLowerCase() === tx.from.toLowerCase() &&
                // Compare amounts with small tolerance or exact string match?
                // Both are strings. 
                Math.abs(parseFloat(chainTx.amount) - parseFloat(tx.amount)) < 0.000001
            );

            if (match) {
                // Found it! Mark settled.
                await storage.updatePendingTransaction(tx.id, {
                    status: 'settled',
                    txHash: match.hash,
                });

                // Update Firebase
                try {
                    await firebase.initialize();
                    await firebase.markAsSettled(tx.id, match.hash);
                } catch (e) {
                    console.warn('Failed to update Firebase:', e);
                }

                return { success: true, txHash: match.hash };
            } else {
                // Not found yet. Keep pending.
                return { success: false, error: 'Transaction not found on-chain yet' };
            }

        } catch (error) {
            return { success: false, error: (error as Error).message };
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
