import { useState } from 'react';

interface WalletSetupProps {
    onComplete: (password: string, mnemonic?: string) => Promise<void>;
}

export function WalletSetup({ onComplete }: WalletSetupProps) {
    const [mode, setMode] = useState<'choice' | 'create' | 'import'>('choice');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [mnemonic, setMnemonic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async () => {
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await onComplete(password);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async () => {
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (!mnemonic.trim()) {
            setError('Please enter your recovery phrase');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await onComplete(password, mnemonic.trim());
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    if (mode === 'choice') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="card max-w-md w-full space-y-6 animate-slide-up">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent mb-2">
                            Offline Wallet
                        </h1>
                        <p className="text-gray-400">
                            Send and receive stablecoins offline with QR vouchers
                        </p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => setMode('create')}
                            className="btn-primary w-full"
                        >
                            Create New Wallet
                        </button>

                        <button
                            onClick={() => setMode('import')}
                            className="btn-secondary w-full"
                        >
                            Import Existing Wallet
                        </button>
                    </div>

                    <div className="text-xs text-gray-500 text-center">
                        <p>🔒 Your keys are encrypted and stored locally</p>
                        <p>Base Sepolia Testnet</p>
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'create') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="card max-w-md w-full space-y-6 animate-slide-up">
                    <div>
                        <button
                            onClick={() => setMode('choice')}
                            className="text-gray-400 hover:text-white mb-4"
                        >
                            ← Back
                        </button>
                        <h2 className="text-2xl font-bold">Create New Wallet</h2>
                        <p className="text-gray-400 mt-1">
                            Choose a strong password to encrypt your wallet
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                placeholder="Enter password (min 8 characters)"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="input-field"
                                placeholder="Confirm password"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleCreate}
                            disabled={isLoading}
                            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Creating...' : 'Create Wallet'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Import mode
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card max-w-md w-full space-y-6 animate-slide-up">
                <div>
                    <button
                        onClick={() => setMode('choice')}
                        className="text-gray-400 hover:text-white mb-4"
                    >
                        ← Back
                    </button>
                    <h2 className="text-2xl font-bold">Import Wallet</h2>
                    <p className="text-gray-400 mt-1">
                        Enter your 12-word recovery phrase
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Recovery Phrase
                        </label>
                        <textarea
                            value={mnemonic}
                            onChange={(e) => setMnemonic(e.target.value)}
                            className="input-field min-h-[100px]"
                            placeholder="Enter your 12-word recovery phrase"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field"
                            placeholder="Enter password (min 8 characters)"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleImport}
                        disabled={isLoading}
                        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Importing...' : 'Import Wallet'}
                    </button>
                </div>
            </div>
        </div>
    );
}
