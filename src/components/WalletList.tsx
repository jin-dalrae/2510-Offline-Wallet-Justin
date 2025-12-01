import { useState, useEffect } from 'react';
import { storage } from '../lib/storage';
import { blockchain } from '../lib/blockchain';
import { WalletManager } from '../lib/wallet';
import toast from 'react-hot-toast';

interface Wallet {
    id: string;
    address: string;
    accountName?: string;
    balance: string;
}

interface WalletListProps {
    activeWalletId: string | null;
    onWalletChange: (walletId: string) => void;
    onClose: () => void;
}

export function WalletList({ activeWalletId, onWalletChange, onClose }: WalletListProps) {
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddWallet, setShowAddWallet] = useState(false);
    const [addMethod, setAddMethod] = useState<'create' | 'import'>('create');
    const [walletName, setWalletName] = useState('');
    const [importKey, setImportKey] = useState('');

    const loadWallets = async () => {
        setLoading(true);
        try {
            const allWallets = await storage.getAllWallets();

            // Load balances for each wallet
            const walletsWithBalances = await Promise.all(
                allWallets.map(async (w) => {
                    const balance = await blockchain.getUSDCBalance(w.address);
                    return {
                        id: w.id,
                        address: w.address,
                        accountName: w.accountName,
                        balance,
                    };
                })
            );

            setWallets(walletsWithBalances);
        } catch (error) {
            console.error('Error loading wallets:', error);
            toast.error('Failed to load wallets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWallets();
    }, []);

    const handleAddWallet = async () => {
        if (!walletName.trim()) {
            toast.error('Please enter a wallet name');
            return;
        }

        try {
            const defaultPassword = 'default-password-for-demo';
            let wallet;
            let privateKey;

            if (addMethod === 'create') {
                // Create new wallet
                const { wallet: newWallet, mnemonic } = WalletManager.createWallet();
                wallet = newWallet;
                privateKey = newWallet.privateKey;

                // Show mnemonic to user
                toast.success('Wallet created! Save your recovery phrase securely.');
                console.log('Recovery phrase:', mnemonic);
            } else {
                // Import wallet
                if (!importKey.trim()) {
                    toast.error('Please enter a private key or mnemonic');
                    return;
                }

                if (importKey.includes(' ')) {
                    wallet = WalletManager.fromMnemonic(importKey);
                } else {
                    wallet = WalletManager.fromPrivateKey(importKey);
                }
                privateKey = wallet.privateKey;
            }

            // Encrypt and save
            const encryptedPrivateKey = await WalletManager.encryptPrivateKey(
                privateKey,
                defaultPassword
            );

            await storage.addWallet(wallet.address, encryptedPrivateKey, walletName);

            toast.success('Wallet added successfully!');
            setShowAddWallet(false);
            setWalletName('');
            setImportKey('');
            await loadWallets();
        } catch (error) {
            console.error('Error adding wallet:', error);
            toast.error('Failed to add wallet');
        }
    };

    const handleRemoveWallet = async (walletId: string, walletName: string) => {
        if (wallets.length === 1) {
            toast.error('Cannot remove the last wallet');
            return;
        }

        if (!confirm(`Are you sure you want to remove "${walletName}"?`)) {
            return;
        }

        try {
            await storage.removeWallet(walletId);
            toast.success('Wallet removed');
            await loadWallets();

            // If removed wallet was active, trigger change to new active
            if (walletId === activeWalletId) {
                const newActiveId = await storage.getActiveWalletId();
                if (newActiveId) {
                    onWalletChange(newActiveId);
                }
            }
        } catch (error) {
            console.error('Error removing wallet:', error);
            toast.error('Failed to remove wallet');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-serif font-bold">My Wallets</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin" />
                        <p className="mt-4 text-slate-600">Loading wallets...</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3 mb-6">
                            {wallets.map((wallet) => (
                                <div
                                    key={wallet.id}
                                    className={`p-4 rounded-2xl border-2 transition-all ${
                                        wallet.id === activeWalletId
                                            ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-lg">
                                                    {wallet.accountName || 'Wallet'}
                                                </h3>
                                                {wallet.id === activeWalletId && (
                                                    <span className="px-2 py-1 bg-[#1e3a5f] text-white text-xs font-bold rounded-full">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 font-mono mb-2">
                                                {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                                            </p>
                                            <p className="text-2xl font-bold font-mono text-[#1e3a5f]">
                                                ${wallet.balance} USDC
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            {wallet.id !== activeWalletId && (
                                                <button
                                                    onClick={() => onWalletChange(wallet.id)}
                                                    className="px-4 py-2 bg-[#1e3a5f] text-white rounded-xl font-medium hover:bg-[#2d4a6f] transition"
                                                >
                                                    Switch
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleRemoveWallet(wallet.id, wallet.accountName || 'Wallet')}
                                                className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition"
                                                title="Remove wallet"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {!showAddWallet ? (
                            <button
                                onClick={() => setShowAddWallet(true)}
                                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-2xl text-slate-600 hover:border-[#1e3a5f] hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition font-medium"
                            >
                                + Add New Wallet
                            </button>
                        ) : (
                            <div className="bg-slate-50 rounded-2xl p-4 space-y-4">
                                <h3 className="font-bold text-lg">Add New Wallet</h3>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setAddMethod('create')}
                                        className={`flex-1 py-2 rounded-xl font-medium transition ${
                                            addMethod === 'create'
                                                ? 'bg-[#1e3a5f] text-white'
                                                : 'bg-white text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        Create New
                                    </button>
                                    <button
                                        onClick={() => setAddMethod('import')}
                                        className={`flex-1 py-2 rounded-xl font-medium transition ${
                                            addMethod === 'import'
                                                ? 'bg-[#1e3a5f] text-white'
                                                : 'bg-white text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        Import
                                    </button>
                                </div>

                                <input
                                    type="text"
                                    placeholder="Wallet name"
                                    value={walletName}
                                    onChange={(e) => setWalletName(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:ring-0 outline-none"
                                />

                                {addMethod === 'import' && (
                                    <textarea
                                        placeholder="Private key or recovery phrase"
                                        value={importKey}
                                        onChange={(e) => setImportKey(e.target.value)}
                                        className="w-full p-3 border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:ring-0 outline-none font-mono text-sm"
                                        rows={3}
                                    />
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setShowAddWallet(false);
                                            setWalletName('');
                                            setImportKey('');
                                        }}
                                        className="flex-1 py-2 bg-white border border-slate-300 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddWallet}
                                        className="flex-1 py-2 bg-[#1e3a5f] text-white rounded-xl font-medium hover:bg-[#2d4a6f] transition"
                                    >
                                        Add Wallet
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
