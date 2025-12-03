import { useState } from 'react';
import { ethers } from 'ethers';
import { firebase } from '../lib/firebase';
import toast from 'react-hot-toast';

interface SignUpProps {
    onComplete: (accountName: string, privateKey: string) => void;
    onBack: () => void;
    onPrivacy: () => void;
}

export function SignUp({ onComplete, onBack, onPrivacy }: SignUpProps) {
    const [accountName, setAccountName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleCreate = async () => {
        if (!accountName.trim()) {
            toast.error('Please enter an account name');
            return;
        }
        if (!username.trim()) {
            toast.error('Please enter a username');
            return;
        }
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (!agreed) {
            toast.error('Please agree to the Terms');
            return;
        }

        setIsLoading(true);

        try {
            // 1. Create random wallet
            const wallet = ethers.Wallet.createRandom();

            // 2. Encrypt private key with password
            const encryptedJson = await wallet.encrypt(password);

            // 3. Save to Firebase
            await firebase.createUser(username, encryptedJson, accountName);

            // 4. Complete
            onComplete(accountName, wallet.privateKey);
        } catch (error: any) {
            console.error('Signup error:', error);
            toast.error(error.message || 'Failed to create account');
            setIsLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        if (!agreed) {
            toast.error('Please agree to the Terms');
            return;
        }

        setIsLoading(true);

        try {
            // 1. Sign in with Google
            const userCredential = await firebase.signInWithGoogle();
            const googleUser = userCredential.user;

            // 2. Create wallet and encrypt with Google UID
            const wallet = ethers.Wallet.createRandom();
            const encryptedWallet = await wallet.encrypt(googleUser.uid);

            // 3. Save to Firebase
            const result = await firebase.getOrCreateGoogleUser(googleUser, encryptedWallet);

            // 4. Complete
            onComplete(result.accountName, wallet.privateKey);

            if (result.isNewUser) {
                toast.success('Account created with Google!');
            } else {
                toast.success('Welcome back!');
            }
        } catch (error: any) {
            console.error('Google sign up error:', error);
            if (error.code === 'auth/popup-closed-by-user') {
                toast.error('Sign up cancelled');
            } else {
                toast.error('Failed to sign up with Google');
            }
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

                <h2 className="text-3xl font-serif font-bold mb-2 text-slate-900">Create Account</h2>
                <p className="text-slate-500 mb-8 font-sans">Set up your secure username and password.</p>

                {/* Google Sign Up Button */}
                <button
                    onClick={handleGoogleSignUp}
                    disabled={isLoading}
                    className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold text-lg py-4 rounded-2xl shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mb-6"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign up with Google
                </button>

                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                    <input
                        type="checkbox"
                        id="google-agreement"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded-lg border-2 border-slate-300 text-slate-900 focus:ring-slate-900 transition-all cursor-pointer"
                        disabled={isLoading}
                    />
                    <label htmlFor="google-agreement" className="text-sm text-slate-600 leading-relaxed cursor-pointer select-none">
                        I agree to the{' '}
                        <button onClick={onPrivacy} className="text-slate-900 font-bold hover:underline">
                            Privacy Policy
                        </button>
                        {' '}and User Agreement. I understand that if I lose access to my Google account, my wallet cannot be recovered.
                    </label>
                </div>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white/80 text-slate-500 font-medium">Or sign up with email</span>
                    </div>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                            Account Name <span className="font-normal text-slate-500">(We'll call you by this name)</span>
                        </label>
                        <input
                            type="text"
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-slate-900 focus:ring-0 outline-none transition-all font-medium text-lg placeholder:text-slate-300"
                            placeholder="e.g. Justin Fan"
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-slate-900 focus:ring-0 outline-none transition-all font-medium text-lg placeholder:text-slate-300"
                            placeholder="Unique username"
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
                            placeholder="Min. 6 characters"
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-slate-900 focus:ring-0 outline-none transition-all font-medium text-lg placeholder:text-slate-300"
                            placeholder="Repeat password"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <input
                            type="checkbox"
                            id="agreement"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="mt-1 w-5 h-5 rounded-lg border-2 border-slate-300 text-slate-900 focus:ring-slate-900 transition-all cursor-pointer"
                            disabled={isLoading}
                        />
                        <label htmlFor="agreement" className="text-sm text-slate-600 leading-relaxed cursor-pointer select-none">
                            I agree to the{' '}
                            <button onClick={onPrivacy} className="text-slate-900 font-bold hover:underline">
                                Privacy Policy
                            </button>
                            {' '}and User Agreement. I understand that if I lose my password, my account cannot be recovered.
                        </label>
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={isLoading}
                        className={`w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:bg-slate-800 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3`}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Creating Wallet...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
