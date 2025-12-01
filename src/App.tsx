import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useWallet } from './hooks/useWallet';
import { useBalance } from './hooks/useBalance';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useSettlement } from './hooks/useSettlement';
import { LandingPage } from './components/LandingPage';
import { SignUp } from './components/SignUp';
import { SignIn } from './components/SignIn';
import { NewDashboard } from './components/NewDashboard';
import { SendOffline } from './components/SendOffline';
import { ReceiveOffline } from './components/ReceiveOffline';
import { TransactionHistory } from './components/TransactionHistory';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { firebase } from './lib/firebase';

type View =
    | 'landing'
    | 'signup'
    | 'signin'
    | 'dashboard'
    | 'send'
    | 'receive'
    | 'history'
    | 'privacy';

function App() {
    const wallet = useWallet();
    const isOnline = useOnlineStatus();
    const { balance, refreshBalance } = useBalance(
        wallet.address,
        isOnline
    );

    const settlement = useSettlement(
        wallet.address,
        wallet.getWallet,
        isOnline
    );

    const [view, setView] = useState<View>('landing');

    // Initialize Firebase
    useEffect(() => {
        firebase.initialize().catch((err) => {
            console.warn('Firebase initialization failed:', err);
        });
    }, []);

    // Determine initial view based on wallet state
    useEffect(() => {
        if (wallet.isUnlocked) {
            setView('dashboard');
        } else {
            setView('landing');
        }
    }, [wallet.isUnlocked]);

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
            setView('dashboard');
        } catch (error) {
            console.error('Sign up error:', error);
            toast.error('Failed to create account');
        }
    };

    const handleSignIn = async (privateKey: string) => {
        try {
            await wallet.loginWithKey(privateKey);
            toast.success('Welcome back!');
            setView('dashboard');
        } catch (error) {
            console.error('Sign in error:', error);
            toast.error('Failed to sign in');
        }
    };

    const handleLoadMoney = () => {
        window.open('https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet', '_blank');
        toast('Opening Coinbase Faucet...', {
            icon: '🪙',
        });
    };

    const handleSendSuccess = () => {
        refreshBalance();
        toast.success('Offline payment sent!');
    };

    const handleReceiveSuccess = () => {
        refreshBalance();
        toast.success('Offline payment received!');
    };

    const handleUnifiedSend = () => {
        if (isOnline) {
            // In a real app, this would check if receiver is online
            // For now, we'll default to the offline voucher flow as it works for both
            // but we could add a "Send to Address" modal here for online-only
            setView('send');
        } else {
            setView('send');
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

            {/* Views */}
            {view === 'landing' && (
                <LandingPage
                    onSignUp={() => setView('signup')}
                    onSignIn={() => setView('signin')}
                    onPrivacy={() => setView('privacy')}
                />
            )}

            {view === 'signup' && (
                <SignUp
                    onComplete={handleSignUp}
                    onBack={() => setView('landing')}
                    onPrivacy={() => setView('privacy')}
                />
            )}

            {view === 'signin' && (
                <SignIn
                    onComplete={handleSignIn}
                    onBack={() => setView('landing')}
                />
            )}

            {view === 'dashboard' && wallet.isUnlocked && (
                <NewDashboard
                    accountName={wallet.accountName || 'My Wallet'}
                    address={wallet.address!}
                    balance={balance}
                    isOnline={isOnline}
                    onSendMoney={handleUnifiedSend}
                    onLoadMoney={handleLoadMoney}
                    onViewHistory={() => setView('history')}
                    onSettings={() => toast('Settings coming soon')}
                    onSendOffline={() => setView('send')}
                    onReceiveOffline={() => setView('receive')}
                    onRefresh={refreshBalance}
                    onLogout={() => {
                        wallet.logout();
                        setView('landing');
                    }}
                />
            )}

            {view === 'send' && wallet.isUnlocked && (
                <SendOffline
                    wallet={wallet.getWallet()}
                    availableBalance={balance.available}
                    onClose={() => setView('dashboard')}
                    onSuccess={handleSendSuccess}
                />
            )}

            {view === 'receive' && wallet.isUnlocked && (
                <ReceiveOffline
                    address={wallet.address!}
                    onClose={() => setView('dashboard')}
                    onSuccess={handleReceiveSuccess}
                />
            )}

            {view === 'history' && wallet.isUnlocked && (
                <TransactionHistory
                    address={wallet.address!}
                    isOnline={isOnline}
                    onClose={() => setView('dashboard')}
                />
            )}

            {view === 'privacy' && (
                <PrivacyPolicy
                    onBack={() => setView(wallet.isUnlocked ? 'dashboard' : 'landing')}
                />
            )}

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
