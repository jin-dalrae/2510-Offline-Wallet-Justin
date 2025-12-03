import { initializeApp, FirebaseApp } from 'firebase/app';
import {
    getFirestore,
    Firestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    limit,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup, Auth, UserCredential } from 'firebase/auth';
import { UserRole, AuditAction, AuditTargetType } from '../types/admin';

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
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            return null;
        }

        const data = userDoc.data();
        return {
            encryptedWallet: data.encryptedWallet,
            accountName: data.accountName,
        };
    }

    /**
     * Sign in with Google OAuth
     */
    async signInWithGoogle(): Promise<UserCredential> {
        if (!this.auth) throw new Error('Firebase Auth not initialized');

        const provider = new GoogleAuthProvider();
        return await signInWithPopup(this.auth, provider);
    }

    /**
     * Get or create user with Google account
     */
    async getOrCreateGoogleUser(
        googleUser: UserCredential['user'],
        encryptedWallet: string
    ): Promise<{ encryptedWallet: string; accountName: string; isNewUser: boolean }> {
        if (!this.isInitialized()) throw new Error('Firebase not initialized');

        const db = this.getDb();
        const userId = `google_${googleUser.uid}`;
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            // Existing user
            const data = userDoc.data();
            return {
                encryptedWallet: data.encryptedWallet,
                accountName: data.accountName,
                isNewUser: false,
            };
        } else {
            // New user - create account
            const accountName = googleUser.displayName || googleUser.email?.split('@')[0] || 'User';

            await setDoc(userRef, {
                username: userId,
                encryptedWallet,
                accountName,
                email: googleUser.email,
                googleUid: googleUser.uid,
                photoURL: googleUser.photoURL,
                createdAt: Timestamp.now(),
                authProvider: 'google',
            });

            return {
                encryptedWallet,
                accountName,
                isNewUser: true,
            };
        }
    }

    // ==================== ADMIN METHODS ====================

    /**
     * Get user role (admin or user)
     */
    async getUserRole(username: string): Promise<UserRole> {
        if (!this.isInitialized()) return 'user';

        try {
            const db = this.getDb();
            const userRef = doc(db, 'users', username.toLowerCase());
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                return 'user';
            }

            const data = userDoc.data();
            return (data.role as UserRole) || 'user';
        } catch (error) {
            console.error('Error getting user role:', error);
            return 'user';
        }
    }

    /**
     * Set user role
     */
    async setUserRole(username: string, role: UserRole): Promise<void> {
        if (!this.isInitialized()) throw new Error('Firebase not initialized');

        const db = this.getDb();
        const userRef = doc(db, 'users', username.toLowerCase());

        await updateDoc(userRef, {
            role,
        });
    }

    /**
     * Log admin action to audit trail
     */
    async logAdminAction(params: {
        adminId: string;
        adminUsername: string;
        action: AuditAction;
        targetType: AuditTargetType;
        targetId: string;
        details: Record<string, any>;
    }): Promise<void> {
        if (!this.isInitialized()) return;

        try {
            const db = this.getDb();
            const auditRef = doc(collection(db, 'admin_audit_log'));

            await setDoc(auditRef, {
                id: auditRef.id,
                timestamp: Timestamp.now(),
                adminId: params.adminId,
                adminUsername: params.adminUsername,
                action: params.action,
                targetType: params.targetType,
                targetId: params.targetId,
                details: params.details,
                ipAddress: '', // Can be populated from request in production
                userAgent: navigator.userAgent,
            });
        } catch (error) {
            console.error('Error logging admin action:', error);
        }
    }

    /**
     * Get all users (for admin dashboard)
     */
    async getAllUsers(limitCount = 50): Promise<any[]> {
        if (!this.isInitialized()) return [];

        try {
            const db = this.getDb();
            const usersCollection = collection(db, 'users');
            const q = query(
                usersCollection,
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );

            const snapshot = await getDocs(q);
            const users: any[] = [];

            snapshot.forEach((doc) => {
                users.push({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toMillis() || Date.now(),
                });
            });

            return users;
        } catch (error) {
            console.error('Error getting all users:', error);
            return [];
        }
    }

    /**
     * Get all transactions (for admin dashboard)
     */
    async getAllTransactions(limitCount = 100): Promise<any[]> {
        if (!this.isInitialized()) return [];

        try {
            const db = this.getDb();
            const txCollection = collection(db, 'pending_transactions');
            const q = query(
                txCollection,
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );

            const snapshot = await getDocs(q);
            const transactions: any[] = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                transactions.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.createdAt?.toMillis() || Date.now(),
                    createdAt: data.createdAt?.toMillis() || Date.now(),
                });
            });

            return transactions;
        } catch (error) {
            console.error('Error getting all transactions:', error);
            return [];
        }
    }

    /**
     * Suspend user
     */
    async suspendUser(
        userId: string,
        reason: string,
        adminId: string
    ): Promise<void> {
        if (!this.isInitialized()) throw new Error('Firebase not initialized');

        const db = this.getDb();
        const userRef = doc(db, 'users', userId.toLowerCase());

        await updateDoc(userRef, {
            status: 'suspended',
            suspendedAt: Timestamp.now(),
            suspendedBy: adminId,
            suspensionReason: reason,
        });

        // Log action
        await this.logAdminAction({
            adminId,
            adminUsername: adminId,
            action: 'suspend_user',
            targetType: 'user',
            targetId: userId,
            details: { reason },
        });
    }

    /**
     * Unsuspend user
     */
    async unsuspendUser(userId: string, adminId: string): Promise<void> {
        if (!this.isInitialized()) throw new Error('Firebase not initialized');

        const db = this.getDb();
        const userRef = doc(db, 'users', userId.toLowerCase());

        await updateDoc(userRef, {
            status: 'active',
            suspendedAt: null,
            suspendedBy: null,
            suspensionReason: null,
        });

        // Log action
        await this.logAdminAction({
            adminId,
            adminUsername: adminId,
            action: 'unsuspend_user',
            targetType: 'user',
            targetId: userId,
            details: {},
        });
    }

    /**
     * Get audit log
     */
    async getAuditLog(limitCount = 100): Promise<any[]> {
        if (!this.isInitialized()) return [];

        try {
            const db = this.getDb();
            const auditCollection = collection(db, 'admin_audit_log');
            const q = query(
                auditCollection,
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            );

            const snapshot = await getDocs(q);
            const logs: any[] = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                logs.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toMillis() || Date.now(),
                });
            });

            return logs;
        } catch (error) {
            console.error('Error getting audit log:', error);
            return [];
        }
    }
}

// Singleton instance
export const firebase = new FirebaseService();
