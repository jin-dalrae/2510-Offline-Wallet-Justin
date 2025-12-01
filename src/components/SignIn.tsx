import { useState } from 'react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

interface SignInProps {
    onComplete: (privateKey: string) => void;
    onBack: () => void;
}

export function SignIn({ onComplete, onBack }: SignInProps) {
    const [privateKey, setPrivateKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignIn = async () => {
        if (!privateKey.trim()) {
            toast.error('Please enter your wallet key');
            return;
        }

        setIsLoading(true);

        try {
            // Validate private key
            new ethers.Wallet(privateKey.trim());

            // If we get here, the key is valid
            onComplete(privateKey.trim());
            toast.success('Signed in successfully!');
        } catch (error) {
            toast.error('Invalid wallet key. Please check and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setPrivateKey(text);
            toast.success('Pasted from clipboard');
        } catch (err) {
            toast.error('Failed to paste');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card max-w-md w-full space-y-6 animate-slide-up">
                <div>
                    <button onClick={onBack} className="text-gray-400 hover:text-white mb-4">
                        ← Back
                    </button>
                    <h2 className="text-2xl font-bold">Sign In</h2>
                    <p className="text-gray-400 mt-1">Enter your wallet key to access your account</p>
                </div>

                <div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium">
                                Recovery Phrase or Private Key
                            </label>
                            <button
                                onClick={handlePaste}
                                className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                            >
                                Paste
                            </button>
                        </div>
                        <textarea
                            value={privateKey}
                            onChange={(e) => setPrivateKey(e.target.value)}
                            className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none font-mono text-sm min-h-[120px]"
                            placeholder="Enter your 12-word phrase or private key..."
                        />
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                        💡 You can enter your 12-word recovery phrase (separated by spaces) or a raw private key.
                    </div>        </div>

                <button
                    onClick={handleSignIn}
                    disabled={isLoading || !privateKey.trim()}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
            </div>
        </div>
    );
}
