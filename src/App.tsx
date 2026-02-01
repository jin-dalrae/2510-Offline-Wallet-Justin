import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { useWallet } from './hooks/useWallet';
import { useBalance } from './hooks/useBalance';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useSettlement } from './hooks/useSettlement';
import { LandingPageAlternative } from './components/LandingPageAlternative';
import { SignUp } from './components/SignUp';
import { SignIn } from './components/SignIn';
import { NewDashboard } from './components/NewDashboard';
import { SendOffline } from './components/SendOffline';
import { ReceiveOffline } from './components/ReceiveOffline';
import { TransactionHistory } from './components/TransactionHistory';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { ProtectedAdminRoute } from './components/admin/ProtectedAdminRoute';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminOverview } from './components/admin/AdminOverview';
import { UserManagement } from './components/admin/UserManagement';
import { TransactionMonitor } from './components/admin/TransactionMonitor';
import { SettlementManagement } from './components/admin/SettlementManagement';
import { SystemHealth } from './components/admin/SystemHealth';
import { AuditLog } from './components/admin/AuditLog';
import { SettingsModal } from './components/SettingsModal';
import { firebase } from './lib/firebase';
import { storage } from './lib/storage';

function App() {
    const navigate = useNavigate();
    const wallet = useWallet();
    const isOnline = useOnlineStatus();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { balance, refreshBalance } = useBalance(
        wallet.address,
        isOnline
    );

    const settlement = useSettlement(
        wallet.address,
        wallet.getWallet,
        isOnline
    );

    // Initialize IndexedDB and Firebase at startup
    useEffect(() => {
        const initializeServices = async () => {
            try {
                // Initialize storage first (critical for wallet operations)
                await storage.init();
            } catch (err) {
                console.error('Failed to initialize storage:', err);
                toast.error('Failed to initialize local storage');
            }

            // Initialize Firebase (optional)
            firebase.initialize().catch((err) => {
                console.warn('Firebase initialization failed, running in offline-only mode:', err);
                toast('Running in offline-only mode', {
                    icon: '📡',
                    duration: 3000,
                });
            });
        };

        initializeServices();
    }, []);

    // Auto-redirect logged-in users away from auth pages to dashboard
    useEffect(() => {
        if (wallet.isUnlocked) {
            const currentPath = window.location.pathname;
            // If user is logged in and on a public page, redirect to dashboard
            if (currentPath === '/' || currentPath === '/signup' || currentPath === '/signin') {
                navigate('/dashboard');
            }
        }
    }, [wallet.isUnlocked, navigate]);

    // Show settlement notifications
    useEffect(() => {
        if (settlement.isSettling) {
            if (settlement.progress) {
                toast.loading(
                    `Settling ${settlement.progress.current}/${settlement.progress.total}...`,
                    { id: 'settlement' }
                );
            }
        } else if (settlement.lastResults.length > 0) {
            toast.dismiss('settlement');

            const successful = settlement.lastResults.filter((r) => r.success);
            const failed = settlement.lastResults.filter((r) => !r.success);

            if (successful.length > 0) {
                toast.success(`${successful.length} transaction(s) settled!`);
                refreshBalance();
            }

            if (failed.length > 0) {
                toast.error(`${failed.length} transaction(s) failed to settle`);
            }
        }
    }, [settlement.isSettling, settlement.progress, settlement.lastResults]);

    const handleSignUp = async (accountName: string, privateKey: string) => {
        try {
            await wallet.createWallet(accountName, privateKey);
            toast.success('Account created!');
            navigate('/dashboard');
        } catch (error) {
            console.error('Sign up error:', error);
            toast.error('Failed to create account');
        }
    };

    const handleSignIn = async (privateKey: string) => {
        try {
            await wallet.loginWithKey(privateKey);
            toast.success('Welcome back!');
            navigate('/dashboard');
        } catch (error) {
            console.error('Sign in error:', error);
            toast.error('Failed to sign in');
        }
    };

    const handleSendSuccess = () => {
        refreshBalance();
        toast.success('Offline payment sent!');
    };

    const handleReceiveSuccess = () => {
        refreshBalance();
        toast.success('Offline payment received!');
    };

    const handleUpdateProfile = async (name: string, picture: string | null) => {
        if (wallet.updateProfile) {
            await wallet.updateProfile(name, picture || undefined);
        }
    };

    return (
        <div className="min-h-screen">
            {/* Toast Notifications */}
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: 'rgba(15, 23, 42, 0.95)',
                        color: '#fff',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '1rem',
                    },
                }}
            />

            {/* Routes */}
            <Routes>
                <Route
                    path="/"
                    element={
                        <LandingPageAlternative
                            onSignUp={() => navigate('/signup')}
                            onSignIn={() => navigate('/signin')}
                            onPrivacy={() => navigate('/privacy')}
                            onTryDemo={() => navigate('/signup')}
                        />
                    }
                />

                <Route
                    path="/signup"
                    element={
                        <SignUp
                            onComplete={handleSignUp}
                            onBack={() => navigate('/')}
                            onPrivacy={() => navigate('/privacy')}
                        />
                    }
                />

                <Route
                    path="/signin"
                    element={
                        <SignIn
                            onComplete={handleSignIn}
                            onBack={() => navigate('/')}
                            onSignUp={() => navigate('/signup')}
                        />
                    }
                />

                <Route
                    path="/dashboard"
                    element={
                        wallet.isUnlocked ? (
                            <NewDashboard
                                accountName={wallet.accountName || 'My Wallet'}
                                profilePicture={wallet.profilePicture || null}
                                address={wallet.address!}
                                wallet={wallet.getWallet()}
                                balance={balance}
                                isOnline={isOnline}
                                onSettings={() => setIsSettingsOpen(true)}
                                onRefresh={refreshBalance}
                                onLogout={() => {
                                    wallet.logout();
                                    navigate('/');
                                }}
                            />
                        ) : (
                            <LandingPageAlternative
                                onSignUp={() => navigate('/signup')}
                                onSignIn={() => navigate('/signin')}
                                onPrivacy={() => navigate('/privacy')}
                                onTryDemo={() => navigate('/signup')}
                            />
                        )
                    }
                />

                <Route
                    path="/send"
                    element={
                        wallet.isUnlocked ? (
                            <SendOffline
                                wallet={wallet.getWallet()}
                                balance={balance}
                                isOnline={isOnline}
                                onClose={() => navigate('/dashboard')}
                                onSuccess={handleSendSuccess}
                            />
                        ) : (
                            <LandingPageAlternative
                                onSignUp={() => navigate('/signup')}
                                onSignIn={() => navigate('/signin')}
                                onPrivacy={() => navigate('/privacy')}
                                onTryDemo={() => navigate('/signup')}
                            />
                        )
                    }
                />

                <Route
                    path="/receive"
                    element={
                        wallet.isUnlocked ? (
                            <ReceiveOffline
                                address={wallet.address!}
                                onClose={() => navigate('/dashboard')}
                                onSuccess={handleReceiveSuccess}
                            />
                        ) : (
                            <LandingPageAlternative
                                onSignUp={() => navigate('/signup')}
                                onSignIn={() => navigate('/signin')}
                                onPrivacy={() => navigate('/privacy')}
                                onTryDemo={() => navigate('/signup')}
                            />
                        )
                    }
                />

                <Route
                    path="/history"
                    element={
                        wallet.isUnlocked ? (
                            <TransactionHistory
                                address={wallet.address!}
                                isOnline={isOnline}
                                onClose={() => navigate('/dashboard')}
                            />
                        ) : (
                            <LandingPageAlternative
                                onSignUp={() => navigate('/signup')}
                                onSignIn={() => navigate('/signin')}
                                onPrivacy={() => navigate('/privacy')}
                                onTryDemo={() => navigate('/signup')}
                            />
                        )
                    }
                />

                <Route
                    path="/privacy"
                    element={
                        <PrivacyPolicy
                            onBack={() => navigate(wallet.isUnlocked ? '/dashboard' : '/')}
                        />
                    }
                />

                {/* Admin Routes */}
                <Route
                    path="/admin/login"
                    element={<AdminLogin />}
                />
                <Route
                    path="/admin"
                    element={
                        <ProtectedAdminRoute>
                            <AdminDashboard>
                                <AdminOverview />
                            </AdminDashboard>
                        </ProtectedAdminRoute>
                    }
                />

                <Route
                    path="/admin/users"
                    element={
                        <ProtectedAdminRoute>
                            <AdminDashboard>
                                <UserManagement />
                            </AdminDashboard>
                        </ProtectedAdminRoute>
                    }
                />

                <Route
                    path="/admin/transactions"
                    element={
                        <ProtectedAdminRoute>
                            <AdminDashboard>
                                <TransactionMonitor />
                            </AdminDashboard>
                        </ProtectedAdminRoute>
                    }
                />

                <Route
                    path="/admin/settlements"
                    element={
                        <ProtectedAdminRoute>
                            <AdminDashboard>
                                <SettlementManagement />
                            </AdminDashboard>
                        </ProtectedAdminRoute>
                    }
                />

                <Route
                    path="/admin/health"
                    element={
                        <ProtectedAdminRoute>
                            <AdminDashboard>
                                <SystemHealth />
                            </AdminDashboard>
                        </ProtectedAdminRoute>
                    }
                />

                <Route
                    path="/admin/audit"
                    element={
                        <ProtectedAdminRoute>
                            <AdminDashboard>
                                <AuditLog />
                            </AdminDashboard>
                        </ProtectedAdminRoute>
                    }
                />
            </Routes>

            {/* Settings Modal */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentName={wallet.accountName || ''}
                currentProfilePicture={wallet.profilePicture || null}
                onSave={handleUpdateProfile}
            />

            {/* Settlement Progress Overlay */}
            {settlement.isSettling && (
                <div className="fixed bottom-4 right-4 card max-w-sm animate-slide-up">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        <div>
                            <p className="font-semibold">Settling Transactions</p>
                            {settlement.progress && (
                                <p className="text-sm text-gray-400">
                                    {settlement.progress.current} of {settlement.progress.total}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
