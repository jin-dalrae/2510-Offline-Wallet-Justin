import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import type { VoucherV3 } from './escrow';

interface WalletDB extends DBSchema {
    wallet: {
        key: string;
        value: {
            id: string;
            address: string;
            encryptedPrivateKey: string;
            accountName?: string;
            profilePicture?: string;
        };
    };
    offlineBalances: {
        key: string;
        value: {
            deviceId: string;
            sent: string; // BigNumber string
            received: string; // BigNumber string
            lastUpdated: number;
        };
    };
    pendingTransactions: {
        key: string;
        value: PendingTransaction;
    };
    settings: {
        key: string;
        value: {
            deviceId: string;
            lastSync: number;
        };
    };
}

export interface PendingTransaction {
    id: string;
    type: 'sent' | 'received';
    from: string;
    to: string;
    amount: string;
    /**
     * The full signed voucher when this entry represents an offline transfer.
     * Absent for transactions that originated as on-chain transfers (no
     * voucher exchange happened).
     */
    voucher?: VoucherV3;
    /** Cached token symbol for UI display when voucher is absent. */
    tokenSymbol?: string;
    timestamp: number;
    status: 'pending' | 'settled' | 'failed';
    txHash?: string;
    deviceId: string;
}

class StorageManager {
    private db: IDBPDatabase<WalletDB> | null = null;
    private deviceId: string | null = null;

    async init(): Promise<void> {
        this.db = await openDB<WalletDB>('OfflineWalletDB', 1, {
            upgrade(db) {
                // Wallet store
                if (!db.objectStoreNames.contains('wallet')) {
                    db.createObjectStore('wallet', { keyPath: 'id' });
                }

                // Offline balances store
                if (!db.objectStoreNames.contains('offlineBalances')) {
                    db.createObjectStore('offlineBalances', { keyPath: 'deviceId' });
                }

                // Pending transactions store
                if (!db.objectStoreNames.contains('pendingTransactions')) {
                    db.createObjectStore('pendingTransactions', { keyPath: 'id' });
                }

                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'deviceId' });
                }
            },
        });

        // Initialize or retrieve device ID
        await this.initDeviceId();
    }

    private async initDeviceId(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const settings = await this.db.get('settings', 'device');
        if (settings) {
            this.deviceId = settings.deviceId;
        } else {
            this.deviceId = uuidv4();
            await this.db.put('settings', {
                deviceId: this.deviceId,
                lastSync: Date.now(),
            });
        }
    }

    getDeviceId(): string {
        if (!this.deviceId) throw new Error('Device ID not initialized');
        return this.deviceId;
    }

    async updateWalletProfile(
        accountName?: string,
        profilePicture?: string | null
    ): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const activeId = await this.getActiveWalletId();
        if (!activeId) throw new Error('No active wallet');

        const wallet = await this.db.get('wallet', activeId);
        if (!wallet) throw new Error('No wallet found');

        const updates: Partial<typeof wallet> = {};
        if (accountName !== undefined) updates.accountName = accountName;
        if (profilePicture !== undefined) {
            updates.profilePicture = profilePicture === null ? undefined : profilePicture;
        }

        await this.db.put('wallet', { ...wallet, ...updates });
    }

    /**
     * Get the currently active wallet record (single source of truth).
     * Returns null if no wallet has been created or imported on this device.
     */
    async getWallet(): Promise<{
        id: string;
        address: string;
        encryptedPrivateKey: string;
        accountName?: string;
        profilePicture?: string;
    } | null> {
        const active = await this.getActiveWallet();
        return active ?? null;
    }

    async deleteActiveWallet(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        const activeId = await this.getActiveWalletId();
        if (!activeId) return;
        await this.db.delete('wallet', activeId);
        localStorage.removeItem('activeWalletId');
    }

    /**
     * Add a wallet record. Becomes the active wallet if it's the first one.
     */
    async addWallet(
        address: string,
        encryptedPrivateKey: string,
        accountName: string
    ): Promise<string> {
        if (!this.db) throw new Error('Database not initialized');

        const walletId = uuidv4();
        await this.db.put('wallet', {
            id: walletId,
            address,
            encryptedPrivateKey,
            accountName,
        });

        const wallets = await this.getAllWallets();
        if (wallets.length === 1) {
            await this.setActiveWallet(walletId);
        }

        return walletId;
    }

    async getAllWallets(): Promise<Array<{
        id: string;
        address: string;
        encryptedPrivateKey: string;
        accountName?: string;
        profilePicture?: string;
    }>> {
        if (!this.db) throw new Error('Database not initialized');
        return await this.db.getAll('wallet');
    }

    async getWalletById(id: string): Promise<{
        id: string;
        address: string;
        encryptedPrivateKey: string;
        accountName?: string;
        profilePicture?: string;
    } | null> {
        if (!this.db) throw new Error('Database not initialized');
        return await this.db.get('wallet', id) || null;
    }

    async removeWallet(id: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        // If removing active wallet, set another as active
        const activeId = await this.getActiveWalletId();
        if (activeId === id) {
            const wallets = await this.getAllWallets();
            const remaining = wallets.filter(w => w.id !== id);
            if (remaining.length > 0) {
                await this.setActiveWallet(remaining[0].id);
            } else {
                localStorage.removeItem('activeWalletId');
            }
        }

        await this.db.delete('wallet', id);
    }

    async setActiveWallet(id: string): Promise<void> {
        localStorage.setItem('activeWalletId', id);
    }

    async getActiveWalletId(): Promise<string | null> {
        return localStorage.getItem('activeWalletId');
    }

    async getActiveWallet(): Promise<{
        id: string;
        address: string;
        encryptedPrivateKey: string;
        accountName?: string;
        profilePicture?: string;
    } | null> {
        const activeId = await this.getActiveWalletId();
        if (!activeId) return null;
        return await this.getWalletById(activeId);
    }

    // Offline balance operations
    async getOfflineBalances(): Promise<{ sent: string; received: string }> {
        if (!this.db) throw new Error('Database not initialized');

        const balances = await this.db.get('offlineBalances', this.getDeviceId());
        if (!balances) {
            return { sent: '0', received: '0' };
        }

        return {
            sent: balances.sent,
            received: balances.received,
        };
    }

    async updateOfflineBalances(sent: string, received: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        await this.db.put('offlineBalances', {
            deviceId: this.getDeviceId(),
            sent,
            received,
            lastUpdated: Date.now(),
        });
    }

    async resetOfflineBalances(): Promise<void> {
        await this.updateOfflineBalances('0', '0');
    }

    // Pending transaction operations
    async addPendingTransaction(transaction: PendingTransaction): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        await this.db.put('pendingTransactions', transaction);
    }

    async getPendingTransactions(): Promise<PendingTransaction[]> {
        if (!this.db) throw new Error('Database not initialized');
        return await this.db.getAll('pendingTransactions');
    }

    async getPendingTransaction(id: string): Promise<PendingTransaction | null> {
        if (!this.db) throw new Error('Database not initialized');
        const tx = await this.db.get('pendingTransactions', id);
        return tx || null;
    }

    async updatePendingTransaction(
        id: string,
        updates: Partial<PendingTransaction>
    ): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const existing = await this.db.get('pendingTransactions', id);
        if (!existing) throw new Error('Transaction not found');

        await this.db.put('pendingTransactions', {
            ...existing,
            ...updates,
        });
    }

    async deletePendingTransaction(id: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        await this.db.delete('pendingTransactions', id);
    }

    async clearSettledTransactions(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const allTransactions = await this.getPendingTransactions();
        const settled = allTransactions.filter((tx) => tx.status === 'settled');

        for (const tx of settled) {
            await this.db.delete('pendingTransactions', tx.id);
        }
    }
}

// Singleton instance
export const storage = new StorageManager();
