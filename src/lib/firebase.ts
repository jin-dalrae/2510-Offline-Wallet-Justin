import { initializeApp, FirebaseApp } from 'firebase/app';
import {
    getFirestore,
    Firestore,
    collection,
    doc,
    setDoc,

    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export interface FirestorePendingTransaction {
    id: string;
    from: string;
    to: string;
    amount: string;
    status: 'pending' | 'claimed' | 'settled' | 'failed';
    createdAt: Timestamp;
    deviceId: string;
    claimDeviceId?: string;
    settledTxHash?: string;
    settledAt?: Timestamp;
    voucherData: {
        version: number;
        privateKey: string;
        amount: string;
        from: string;
        to: string;
        timestamp: number;
        signature: string;
    };
}

class FirebaseService {
    private app: FirebaseApp | null = null;
    private db: Firestore | null = null;
    private auth: Auth | null = null;
    private initialized: boolean = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Check if Firebase config is available
            if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
                console.warn('Firebase configuration not found. Running in offline-only mode.');
                return;
            }

            this.app = initializeApp(firebaseConfig);
            this.db = getFirestore(this.app);
            this.auth = getAuth(this.app);

            // Sign in anonymously
            await signInAnonymously(this.auth);

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize Firebase:', error);
            throw error;
        }
    }

    isInitialized(): boolean {
        return this.initialized && this.db !== null;
    }

    getDb(): Firestore {
        if (!this.db) {
            throw new Error('Firebase not initialized');
        }
        return this.db;
    }

    /**
     * Add a pending transaction to Firestore
     */
    async addPendingTransaction(
        transaction: Omit<FirestorePendingTransaction, 'createdAt'>
    ): Promise<void> {
        if (!this.isInitialized()) return;

        const db = this.getDb();
        const txRef = doc(db, 'pending_transactions', transaction.id);

        await setDoc(txRef, {
            ...transaction,
            createdAt: Timestamp.now(),
        });
    }

    /**
     * Get pending transactions for a user
     */
    async getPendingTransactions(
        address: string
    ): Promise<FirestorePendingTransaction[]> {
        if (!this.isInitialized()) return [];

        const db = this.getDb();
        const txCollection = collection(db, 'pending_transactions');

        // Get transactions where user is sender or receiver
        const [sentQuery, receivedQuery] = [
            query(
                txCollection,
                where('from', '==', address),
                orderBy('createdAt', 'desc')
            ),
            query(
                txCollection,
                where('to', '==', address),
                orderBy('createdAt', 'desc')
            ),
        ];

        const [sentSnapshot, receivedSnapshot] = await Promise.all([
            getDocs(sentQuery),
            getDocs(receivedQuery),
        ]);

        const transactions: FirestorePendingTransaction[] = [];

        sentSnapshot.forEach((doc) => {
            transactions.push(doc.data() as FirestorePendingTransaction);
        });

        receivedSnapshot.forEach((doc) => {
            transactions.push(doc.data() as FirestorePendingTransaction);
        });

        // Remove duplicates and sort by timestamp
        const uniqueTxs = Array.from(
            new Map(transactions.map((tx) => [tx.id, tx])).values()
        );

        return uniqueTxs.sort(
            (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
        );
    }

    /**
     * Update transaction status
     */
    async updateTransaction(
        id: string,
        updates: Partial<FirestorePendingTransaction>
    ): Promise<void> {
        if (!this.isInitialized()) return;

        const db = this.getDb();
        const txRef = doc(db, 'pending_transactions', id);

        const updateData: any = { ...updates };

        // Convert timestamp fields
        if (updates.settledAt) {
            updateData.settledAt = Timestamp.now();
        }

        await updateDoc(txRef, updateData);
    }

    /**
     * Delete a transaction
     */
    async deleteTransaction(id: string): Promise<void> {
        if (!this.isInitialized()) return;

        const db = this.getDb();
        const txRef = doc(db, 'pending_transactions', id);
        await deleteDoc(txRef);
    }

    /**
     * Mark transaction as settled
     */
    async markAsSettled(id: string, txHash: string): Promise<void> {
        await this.updateTransaction(id, {
            status: 'settled',
            settledTxHash: txHash,
            settledAt: Timestamp.now(),
        });
    }

    /**
     * Create a new user with encrypted wallet
     */
    async createUser(
        username: string,
        encryptedWallet: string,
        accountName: string
    ): Promise<void> {
        if (!this.isInitialized()) throw new Error('Firebase not initialized');

        const db = this.getDb();
        const userRef = doc(db, 'users', username.toLowerCase());

        // Check if user already exists
        const userDoc = await getDocs(query(collection(db, 'users'), where('username', '==', username.toLowerCase())));
        if (!userDoc.empty) {
            throw new Error('Username already exists');
        }

        await setDoc(userRef, {
            username: username.toLowerCase(),
            encryptedWallet,
            accountName,
            createdAt: Timestamp.now(),
        });
    }

    /**
     * Get user by username
     */
    async getUser(username: string): Promise<{ encryptedWallet: string; accountName: string } | null> {
        if (!this.isInitialized()) throw new Error('Firebase not initialized');

        const db = this.getDb();
        const userRef = doc(db, 'users', username.toLowerCase());
        const userDoc = await import('firebase/firestore').then(m => m.getDoc(userRef));

        if (!userDoc.exists()) {
            return null;
        }

        const data = userDoc.data();
        return {
            encryptedWallet: data.encryptedWallet,
            accountName: data.accountName,
        };
    }
}

// Singleton instance
export const firebase = new FirebaseService();
