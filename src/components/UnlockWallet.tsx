import { useState } from 'react';

interface UnlockWalletProps {
    address: string;
    onUnlock: (password: string) => Promise<void>;
}

export function UnlockWallet({ address, onUnlock }: UnlockWalletProps) {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password) {
            setError('Please enter your password');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await onUnlock(password);
        } catch (err) {
            setError('Invalid password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card max-w-md w-full space-y-6 animate-slide-up">
                <div className="text-center">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent mb-2">
                        Welcome Back
                    </h1>
                    <p className="text-gray-400 text-sm mt-4">
                        {address.slice(0, 6)}...{address.slice(-4)}
                    </p>
                </div>

                <form onSubmit={handleUnlock} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field"
                            placeholder="Enter your password"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Unlocking...' : 'Unlock Wallet'}
                    </button>
                </form>
            </div>
        </div>
    );
}
