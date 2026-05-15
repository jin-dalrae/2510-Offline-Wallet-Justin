import { ethers } from 'ethers';
import { JustinSigner } from "./signer";
import { storage, PendingTransaction } from './storage';
import { blockchain } from './blockchain';
import { escrow } from './escrow';
import { firebase } from './firebase';

export interface SettlementResult {
    success: boolean;
    txHash?: string;
    error?: string;
    retries?: number;
    transactionId?: string;
}

interface SettlementConfig {
    maxRetries: number;
    retryDelayMs: number;
}

async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Settlement under the escrow model:
 *
 *   - SENT pending tx (with a voucher): the sender has nothing to broadcast
 *     — the escrow contract already holds their collateral. Settlement just
 *     watches the chain for the receiver's claim() and flips status to
 *     'settled' once the voucher's nonce is marked used.
 *
 *   - RECEIVED pending tx (with a voucher): the receiver calls escrow.claim()
 *     on-chain, which transfers the tokens from the sender's locked budget
 *     to the receiver's wallet.
 *
 *   - SENT pending tx without a voucher (online direct transfer that didn't
 *     finish confirming): wait for the tx hash to confirm.
 */
export class SettlementService {
    private isSettling: boolean = false;
    private config: SettlementConfig = {
        maxRetries: 3,
        retryDelayMs: 2000,
    };

    async settlePendingTransactions(
        mainWallet: JustinSigner,
        onProgress?: (current: number, total: number, status: string) => void
    ): Promise<SettlementResult[]> {
        if (this.isSettling) {
            return [{ success: false, error: 'Settlement already in progress' }];
        }
        this.isSettling = true;
        const results: SettlementResult[] = [];

        try {
            const allPending = await storage.getPendingTransactions();
            const pendingTxs = allPending.filter(tx => tx.status === 'pending');

            if (pendingTxs.length === 0) {
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
                    result = await this.settleSentWithRetry(tx);
                } else {
                    result = await this.settleReceivedWithRetry(tx, mainWallet);
                }
                result.transactionId = tx.id;
                results.push(result);

                if (result.success) await delay(500);
            }

            await this.recalculateOfflineBalances();

            onProgress?.(pendingTxs.length, pendingTxs.length, 'Settlement complete');
        } catch (error) {
            console.error('Settlement error:', error);
            results.push({ success: false, error: (error as Error).message });
        } finally {
            this.isSettling = false;
        }

        return results;
    }

    /**
     * SENT path: confirm the voucher has been claimed (or, for a direct
     * online transfer, confirm the broadcast tx).
     */
    private async settleSentWithRetry(tx: PendingTransaction): Promise<SettlementResult> {
        for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
            const result = await this.settleSent(tx);
            if (result.success) return { ...result, retries: attempt };
            if (attempt < this.config.maxRetries - 1) {
                await delay(this.config.retryDelayMs * Math.pow(2, attempt));
            }
        }
        return { success: false, error: 'Max retries exceeded', retries: this.config.maxRetries };
    }

    private async settleSent(tx: PendingTransaction): Promise<SettlementResult> {
        try {
            // Voucher-based send: check if the receiver has claimed it on-chain.
            if (tx.voucher) {
                const av = escrow.isAvailable();
                if (!av.available) {
                    return { success: false, error: 'Escrow not configured locally' };
                }
                // Read the usedNonce flag from the contract directly.
                const contract = new ethers.Contract(
                    av.address!,
                    ['function usedNonce(address sender, bytes32 nonce) view returns (bool)'],
                    blockchain.getProvider()
                );
                const claimed = await contract.usedNonce(tx.voucher.from, tx.voucher.nonce);
                if (!claimed) {
                    return { success: false, error: 'Receiver has not claimed yet' };
                }
                // Mark settled. We don't have the claim's tx hash from this view,
                // but we can search the chain for the Claimed event next time we sync.
                await storage.updatePendingTransaction(tx.id, { status: 'settled' });
                return { success: true };
            }

            // Direct online transfer that didn't finish confirming earlier.
            if (tx.txHash) {
                const receipt = await blockchain.getTransactionReceipt(tx.txHash);
                if (receipt && receipt.status === 1) {
                    await storage.updatePendingTransaction(tx.id, { status: 'settled' });
                    return { success: true, txHash: tx.txHash };
                }
                if (receipt && receipt.status === 0) {
                    await storage.updatePendingTransaction(tx.id, { status: 'failed' });
                    return { success: false, error: 'Transaction reverted on-chain' };
                }
                return { success: false, error: 'Transaction not yet confirmed' };
            }

            return { success: false, error: 'No voucher or tx hash to settle against' };
        } catch (error) {
            console.error('Failed to settle sent transaction:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * RECEIVED path: submit the voucher to the escrow contract so funds
     * move from sender's locked budget to receiver's wallet.
     */
    private async settleReceivedWithRetry(
        tx: PendingTransaction,
        wallet: JustinSigner
    ): Promise<SettlementResult> {
        for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
            const result = await this.settleReceived(tx, wallet);
            if (result.success) return { ...result, retries: attempt };
            if (result.error?.includes('NonceAlreadyUsed') ||
                result.error?.includes('InvalidSignature') ||
                result.error?.includes('VoucherExpired')) {
                // Permanent failures — don't retry.
                await storage.updatePendingTransaction(tx.id, { status: 'failed' });
                return result;
            }
            if (attempt < this.config.maxRetries - 1) {
                await delay(this.config.retryDelayMs * Math.pow(2, attempt));
            }
        }
        return { success: false, error: 'Max retries exceeded', retries: this.config.maxRetries };
    }

    private async settleReceived(
        tx: PendingTransaction,
        wallet: JustinSigner
    ): Promise<SettlementResult> {
        try {
            if (!tx.voucher) {
                return { success: false, error: 'Received tx has no voucher to claim' };
            }
            const av = escrow.isAvailable();
            if (!av.available) {
                return { success: false, error: 'Escrow not configured' };
            }

            // Quote first so we surface specific failure reasons cheaply.
            const quote = await escrow.quoteClaim(tx.voucher);
            if (!quote.claimable) {
                if (quote.reason === 'nonce_used') {
                    // Someone else (or us in a prior attempt) already claimed.
                    await storage.updatePendingTransaction(tx.id, { status: 'settled' });
                    return { success: true, error: 'already_claimed' };
                }
                return { success: false, error: quote.reason };
            }

            // Receiver pays gas for their own claim. Could be relayed in future.
            const hasGas = await blockchain.hasEnoughGas(wallet.address);
            if (!hasGas) return { success: false, error: 'Insufficient ETH for gas' };

            const txResp = await escrow.claim(wallet, tx.voucher);
            await txResp.wait(1);

            await storage.updatePendingTransaction(tx.id, {
                status: 'settled',
                txHash: txResp.hash,
            });

            try {
                await firebase.initialize();
                await firebase.markAsSettled(tx.id, txResp.hash);
            } catch (e) {
                console.warn('Failed to update Firebase:', e);
            }

            return { success: true, txHash: txResp.hash };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    private async recalculateOfflineBalances(): Promise<void> {
        const pendingTxs = await storage.getPendingTransactions();
        let sentTotal = 0;
        let receivedTotal = 0;
        for (const tx of pendingTxs) {
            if (tx.status !== 'pending') continue;
            const amount = parseFloat(tx.amount);
            if (tx.type === 'sent') sentTotal += amount;
            else if (tx.type === 'received') receivedTotal += amount;
        }
        await storage.updateOfflineBalances(sentTotal.toString(), receivedTotal.toString());
    }

    async syncWithFirebase(address: string): Promise<void> {
        if (!firebase.isInitialized()) return;

        try {
            const firestoreTxs = await firebase.getPendingTransactions(address);
            const localTxs = await storage.getPendingTransactions();

            for (const firestoreTx of firestoreTxs) {
                const localTx = localTxs.find((tx) => tx.id === firestoreTx.id);
                if (localTx && localTx.status !== firestoreTx.status) {
                    await storage.updatePendingTransaction(firestoreTx.id, {
                        status: firestoreTx.status as 'pending' | 'settled' | 'failed',
                        txHash: firestoreTx.settledTxHash,
                    });
                }
            }
            await this.recalculateOfflineBalances();
        } catch (error) {
            console.error('Error syncing with Firebase:', error);
        }
    }

    isInProgress(): boolean {
        return this.isSettling;
    }
}

export const settlement = new SettlementService();
