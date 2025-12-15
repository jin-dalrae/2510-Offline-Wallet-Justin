import { useState, useEffect } from 'react';
import { storage } from '../lib/storage';
import toast from 'react-hot-toast';

export function DevTools() {
    const [isOpen, setIsOpen] = useState(false);
    const [address, setAddress] = useState<string | null>(null);

    useEffect(() => {
        loadWallet();
    }, [isOpen]);

    const loadWallet = async () => {
        const wallet = await storage.getWallet();
        if (wallet) {
            setAddress(wallet.address);
            try {
                // Determine if we can decrypt specific wallet or just show hidden
                // For dev purposes, we might want to expose it if unlocked
                // But typically it's encrypted. 
                // We'll just provide a copy button for the address mostly.
                // If we want PK, we need the password.
            } catch (e) {
                console.error(e);
            }
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied!`);
    };

    const handleClearStorage = async () => {
        if (confirm('Are you sure? This will wipe all wallets and transactions.')) {
            localStorage.clear();
            // We'd need to clear IDB too. 
            // For now, reload will help clear basic state, but IDB persists.
            // A real "Clear Information" usually needs to drop databases.
            // Simple way:
            const databases = await window.indexedDB.databases();
            for (const db of databases) {
                if (db.name) window.indexedDB.deleteDatabase(db.name);
            }
            window.location.reload();
        }
    };

    const openFaucet = () => {
        window.open('https://portal.cdp.coinbase.com/products/faucet', '_blank');
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 bg-red-600 text-white p-2 rounded-full shadow-lg z-50 text-xs font-bold opacity-50 hover:opacity-100 transition-opacity"
            >
                DEV
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 bg-white border-2 border-slate-900 rounded-2xl shadow-2xl z-50 w-72 overflow-hidden animate-slide-up">
            <div className="bg-slate-900 text-white p-3 flex justify-between items-center">
                <span className="font-bold text-sm">Developer Tools</span>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-4 space-y-4">
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Testnet Funding</p>
                    <button
                        onClick={openFaucet}
                        className="w-full bg-blue-50 text-blue-600 font-bold py-2 rounded-lg text-sm hover:bg-blue-100 transition"
                    >
                        Get Testnet ETH (Faucet)
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                        Required to pay gas fees until Smart Wallet is integrated.
                    </p>
                </div>

                {address && (
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Current Wallet</p>
                        <button
                            onClick={() => copyToClipboard(address, 'Address')}
                            className="w-full bg-slate-50 border border-slate-200 text-left p-2 rounded-lg text-xs font-mono truncate hover:bg-slate-100 transition"
                        >
                            {address}
                        </button>
                    </div>
                )}

                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Danger Zone</p>
                    <button
                        onClick={handleClearStorage}
                        className="w-full bg-red-50 text-red-600 font-bold py-2 rounded-lg text-sm hover:bg-red-100 transition"
                    >
                        Factory Reset App
                    </button>
                </div>
            </div>
        </div>
    );
}
