import { useState } from 'react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { firebase } from '../lib/firebase';

interface SignInProps {
    onComplete: (privateKey: string) => void;
    onBack: () => void;
}

export function SignIn({ onComplete, onBack }: SignInProps) {
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

        try {
            // 1. Get encrypted wallet from Firebase
            const user = await firebase.getUser(username);

            if (!user) {
                toast.error('User not found');
                setIsLoading(false);
                return;
            }

            // 2. Decrypt wallet
            const wallet = await ethers.Wallet.fromEncryptedJson(user.encryptedWallet, password);

            // 3. Complete
            onComplete(wallet.privateKey);
            toast.success('Welcome back!');
        } catch (error) {
            console.error('Sign in error:', error);
            toast.error('Invalid password or login failed');
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

                        <div className="text-center pt-4">
                            <button
                                onClick={() => setMode('key')}
                                className="text-slate-500 hover:text-slate-900 text-sm font-medium underline"
                            >
                                I want to use my recovery phrase instead
                            </button>
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
