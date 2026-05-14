import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { firebase } from '../lib/firebase';
import { storage } from '../lib/storage';

interface SignInProps {
    onPassword: (password: string) => Promise<void>;
    onImport: (keyOrMnemonic: string, password: string) => Promise<void>;
    onBack: () => void;
    onSignUp?: () => void;
}

export function SignIn({ onPassword, onImport, onBack, onSignUp }: SignInProps) {
    const [mode, setMode] = useState<'password' | 'key'>('password');
    const [password, setPassword] = useState('');
    const [privateKey, setPrivateKey] = useState('');
    const [importPassword, setImportPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasLocalWallet, setHasLocalWallet] = useState<boolean | null>(null);

    useEffect(() => {
        storage.init()
            .then(() => storage.getWallet())
            .then((w) => setHasLocalWallet(!!w))
            .catch(() => setHasLocalWallet(false));
    }, []);

    const handlePasswordSignIn = async () => {
        if (!password) {
            toast.error('Please enter your password');
            return;
        }
        setIsLoading(true);
        try {
            await onPassword(password);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeySignIn = async () => {
        if (!privateKey.trim()) {
            toast.error('Please enter your wallet key or recovery phrase');
            return;
        }
        if (!importPassword) {
            toast.error('Please choose a password to protect this wallet on this device');
            return;
        }
        setIsLoading(true);
        try {
            await onImport(privateKey.trim(), importPassword);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            const userCredential = await firebase.signInWithGoogle();
            const googleUser = userCredential.user;

            const userId = `google_${googleUser.uid}`;
            const existingUser = await firebase.getUser(userId);

            if (existingUser) {
                // Decrypt with Google UID, then import using UID as the device password.
                const wallet = await ethers.Wallet.fromEncryptedJson(
                    existingUser.encryptedWallet,
                    googleUser.uid
                );
                await onImport(wallet.privateKey, googleUser.uid);
                toast.success('Welcome back!');
            } else {
                // New: mint a wallet and persist via the import path.
                const newWallet = ethers.Wallet.createRandom();
                const encryptedWallet = await newWallet.encrypt(googleUser.uid);
                await firebase.getOrCreateGoogleUser(googleUser, encryptedWallet);
                await onImport(newWallet.privateKey, googleUser.uid);
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
                        {hasLocalWallet === false && (
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-sm">
                                No wallet found on this device. Use "I want to use my recovery phrase instead" below to import one, or create a new account.
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-slate-900 focus:ring-0 outline-none transition-all font-medium text-lg placeholder:text-slate-300"
                                placeholder="Your password"
                                disabled={isLoading || hasLocalWallet === false}
                                onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSignIn(); }}
                            />
                        </div>

                        <button
                            onClick={handlePasswordSignIn}
                            disabled={isLoading || hasLocalWallet === false}
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
                                placeholder="Enter your 12-word phrase or 0x... private key"
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                                New Password <span className="font-normal text-slate-500">(protects this wallet on this device)</span>
                            </label>
                            <input
                                type="password"
                                value={importPassword}
                                onChange={(e) => setImportPassword(e.target.value)}
                                className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-slate-900 focus:ring-0 outline-none transition-all font-medium text-lg placeholder:text-slate-300"
                                placeholder="Choose a password"
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
                                Back to Password
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
