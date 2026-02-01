import { useState } from 'react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { firebase } from '../lib/firebase';

interface SignInProps {
    onComplete: (privateKey: string) => void;
    onBack: () => void;
    onSignUp?: () => void;
}

export function SignIn({ onComplete, onBack, onSignUp }: SignInProps) {
    const [mode, setMode] = useState<'password' | 'key'>('password');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [privateKey, setPrivateKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handlePasswordSignIn = async () => {
        if (!username.trim() || !password) {
            toast.error('Please enter username and password');
            return;
        }

        setIsLoading(true);
        const usernameInput = username.trim().toLowerCase();

        try {
            // Try local storage first (for local-only mode)
            const { storage } = await import('../lib/storage');
            await storage.init();
            const localWallets = await storage.getAllWallets();

            // Search by both accountName AND any stored username/identifier
            const localWallet = localWallets.find(
                w => w.accountName?.toLowerCase() === usernameInput ||
                    w.address?.toLowerCase() === usernameInput
            );

            if (localWallet) {
                try {
                    const wallet = await ethers.Wallet.fromEncryptedJson(localWallet.encryptedPrivateKey, password);
                    await storage.setActiveWallet(localWallet.id);
                    onComplete(wallet.privateKey);
                    toast.success('Welcome back!');
                    return;
                } catch (decryptError) {
                    // Wrong password for local wallet
                    toast.error('Incorrect password');
                    setIsLoading(false);
                    return;
                }
            }

            // Try Firebase if local not found
            if (firebase.isInitialized()) {
                const user = await firebase.getUser(username);

                if (!user) {
                    toast.error('Account not found. Check your username or create a new account.');
                    setIsLoading(false);
                    return;
                }

                // Decrypt wallet
                try {
                    const wallet = await ethers.Wallet.fromEncryptedJson(user.encryptedWallet, password);

                    // Save locally for future offline access
                    try {
                        const walletId = await storage.addWallet(
                            wallet.address,
                            user.encryptedWallet,
                            user.accountName
                        );
                        await storage.setActiveWallet(walletId);
                    } catch (e) {
                        console.warn('Could not cache wallet locally:', e);
                    }

                    onComplete(wallet.privateKey);
                    toast.success('Welcome back!');
                } catch (decryptError) {
                    toast.error('Incorrect password');
                }
            } else {
                toast.error('Account not found locally. Connect to internet or create a new account.');
            }
        } catch (error) {
            console.error('Sign in error:', error);
            toast.error('Sign in failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };


    const handleKeySignIn = async () => {
        if (!privateKey.trim()) {
            toast.error('Please enter your wallet key');
            return;
        }

        setIsLoading(true);

        try {
            // Try as mnemonic first
            try {
                const wallet = ethers.Wallet.fromPhrase(privateKey.trim());
                onComplete(wallet.privateKey);
                return;
            } catch (e) {
                // Not a mnemonic, try as private key
            }

            // Try as private key
            new ethers.Wallet(privateKey.trim());
            onComplete(privateKey.trim());
        } catch (error) {
            toast.error('Invalid wallet key or phrase');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);

        try {
            // 1. Sign in with Google
            const userCredential = await firebase.signInWithGoogle();
            const googleUser = userCredential.user;

            // 2. Check if user exists, if not create wallet
            const userId = `google_${googleUser.uid}`;
            const existingUser = await firebase.getUser(userId);

            if (existingUser) {
                // Existing user - decrypt wallet with Google UID as password
                const wallet = await ethers.Wallet.fromEncryptedJson(
                    existingUser.encryptedWallet,
                    googleUser.uid
                );
                onComplete(wallet.privateKey);
                toast.success('Welcome back!');
            } else {
                // New user - create wallet and encrypt with Google UID
                const newWallet = ethers.Wallet.createRandom();
                const encryptedWallet = await newWallet.encrypt(googleUser.uid);

                await firebase.getOrCreateGoogleUser(googleUser, encryptedWallet);

                onComplete(newWallet.privateKey);
                toast.success('Account created with Google!');
            }
        } catch (error: any) {
            console.error('Google sign in error:', error);
            if (error.code === 'auth/popup-closed-by-user') {
                toast.error('Sign in cancelled');
            } else {
                toast.error('Failed to sign in with Google');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#eaff7b] to-[#4bf2e6] font-sans text-slate-800">
            <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl animate-fade-in">
                <button
                    onClick={onBack}
                    className="mb-6 text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors font-medium"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                </button>

                <h2 className="text-3xl font-serif font-bold mb-2 text-slate-900">Sign In</h2>
                <p className="text-slate-500 mb-8 font-sans">Access your wallet securely.</p>

                {/* Google Sign In Button */}
                <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold text-lg py-4 rounded-2xl shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mb-6"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign in with Google
                </button>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white/80 text-slate-500 font-medium">Or continue with</span>
                    </div>
                </div>

                {mode === 'password' ? (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-slate-900 focus:ring-0 outline-none transition-all font-medium text-lg placeholder:text-slate-300"
                                placeholder="Your username"
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-slate-900 focus:ring-0 outline-none transition-all font-medium text-lg placeholder:text-slate-300"
                                placeholder="Your password"
                                disabled={isLoading}
                            />
                        </div>

                        <button
                            onClick={handlePasswordSignIn}
                            disabled={isLoading}
                            className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:bg-slate-800 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing In...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>

                        <div className="text-center pt-4 space-y-3">
                            <button
                                onClick={() => setMode('key')}
                                className="text-slate-500 hover:text-slate-900 text-sm font-medium underline"
                            >
                                I want to use my recovery phrase instead
                            </button>
                            {onSignUp && (
                                <div className="pt-2 border-t border-slate-200">
                                    <p className="text-sm text-slate-500">
                                        Don't have an account?{' '}
                                        <button
                                            onClick={onSignUp}
                                            className="text-slate-900 font-bold hover:underline"
                                        >
                                            Create Account
                                        </button>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Recovery Phrase or Private Key</label>
                            <textarea
                                value={privateKey}
                                onChange={(e) => setPrivateKey(e.target.value)}
                                className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-slate-900 focus:ring-0 outline-none transition-all font-medium text-sm font-mono min-h-[120px] placeholder:text-slate-300"
                                placeholder="Enter your 12-word phrase..."
                                disabled={isLoading}
                            />
                        </div>

                        <button
                            onClick={handleKeySignIn}
                            disabled={isLoading}
                            className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:bg-slate-800 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Recovering...
                                </>
                            ) : (
                                'Recover Wallet'
                            )}
                        </button>

                        <div className="text-center pt-4">
                            <button
                                onClick={() => setMode('password')}
                                className="text-slate-500 hover:text-slate-900 text-sm font-medium underline"
                            >
                                Back to Username/Password
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
