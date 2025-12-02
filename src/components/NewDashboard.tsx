import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BalanceState } from '../hooks/useBalance';
import toast from 'react-hot-toast';
import { WalletList } from './WalletList';
import { storage } from '../lib/storage';

interface NewDashboardProps {
    accountName: string;
    address: string;
    balance: BalanceState;
    isOnline: boolean;
    onSendMoney: () => void;
    onLoadMoney: () => void;
    onViewHistory: () => void;
    onSettings: () => void;
    onReceiveOffline: () => void;
    onSendOffline: () => void;
    onRefresh: () => void;
    onLogout: () => void;
}

export function NewDashboard({
    accountName,
    address,
    balance,
    isOnline,
    onSendMoney,
    onLoadMoney,
    onViewHistory,
    onSettings,
    onReceiveOffline,
    onSendOffline,
    onRefresh,
    onLogout,
}: NewDashboardProps) {
    const [showBalance, setShowBalance] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showWalletList, setShowWalletList] = useState(false);
    const [offlineAllowanceLimit, setOfflineAllowanceLimit] = useState(0);
    const [offlineSpent, setOfflineSpent] = useState(0);
    const [activeWalletId, setActiveWalletId] = useState<string | null>(null);

    // Load active wallet ID
    useEffect(() => {
        const loadActiveWallet = async () => {
            const id = await storage.getActiveWalletId();
            setActiveWalletId(id);
        };
        loadActiveWallet();
    }, []);

    // Load offline allowance settings from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(`offlineAllowance_${address}`);
        if (saved) {
            const { limit, spent } = JSON.parse(saved);
            setOfflineAllowanceLimit(limit || 0);
            setOfflineSpent(spent || 0);
        }
    }, [address]);

    // Save offline allowance settings to localStorage
    useEffect(() => {
        if (address) {
            localStorage.setItem(
                `offlineAllowance_${address}`,
                JSON.stringify({ limit: offlineAllowanceLimit, spent: offlineSpent })
            );
        }
    }, [address, offlineAllowanceLimit, offlineSpent]);

    // Reset offline spent when going back online
    useEffect(() => {
        if (isOnline) {
            setOfflineSpent(0);
        }
    }, [isOnline]);

    // Listen for changes to offline allowance from other components
    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem(`offlineAllowance_${address}`);
            if (saved) {
                const { limit, spent } = JSON.parse(saved);
                setOfflineAllowanceLimit(limit || 0);
                setOfflineSpent(spent || 0);
            }
        };

        // Listen for custom event when localStorage is updated
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('offlineAllowanceUpdated', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('offlineAllowanceUpdated', handleStorageChange);
        };
    }, [address]);

    const handleCopyAddress = async () => {
        try {
            await navigator.clipboard.writeText(address);
            toast.success('Address copied!');
        } catch (err) {
            toast.error('Failed to copy');
        }
    };

    const totalBalance = parseFloat(balance.onChain) + parseFloat(balance.offlineReceived) - parseFloat(balance.offlineSent);

    const handleWalletChange = async (walletId: string) => {
        try {
            await storage.setActiveWallet(walletId);
            setActiveWalletId(walletId);
            setShowWalletList(false);
            toast.success('Active wallet updated');
        } catch (error) {
            console.error('Failed to switch wallet:', error);
            toast.error('Failed to switch wallet');
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 p-6">
            {/* Side Menu Overlay */}
            {showMenu && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMenu(false)} />
                    <div className="relative w-64 bg-white h-full shadow-2xl animate-slide-right p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-serif font-bold">justin</h2>
                            <button onClick={() => setShowMenu(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <nav className="space-y-4 flex-1">
                            <button onClick={() => { setShowWalletList(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl font-medium flex items-center gap-3">
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                My Wallets
                            </button>
                            <button onClick={onViewHistory} className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl font-medium flex items-center gap-3">
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                History
                            </button>
                            <button onClick={onSettings} className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl font-medium flex items-center gap-3">
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Settings
                            </button>
                        </nav>

                        <button onClick={onLogout} className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium flex items-center gap-3 mt-auto">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Log Out
                        </button>
                    </div>
                </div>
            )}

            {/* Wallet Container */}
            <div className="max-w-2xl mx-auto bg-gradient-to-b from-[#eaff7b] to-[#4bf2e6] rounded-3xl p-6 shadow-xl">
                {/* Header */}
                <div className="mb-6 flex justify-between items-start">
                    <div>
                        <h1 className="text-5xl font-serif font-bold mb-2">justin</h1>
                        <p className="text-lg text-slate-800 font-medium">Let's reinvent Cash with Tech.</p>
                    </div>
                    <button
                        onClick={() => setShowMenu(true)}
                        className="p-2 hover:bg-white/50 rounded-full transition-colors"
                    >
                        <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>

            {/* Main Content */}
            <div className="space-y-4">
                {/* Balance Card */}
                <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-2xl font-serif font-bold text-slate-800">Hello, {accountName}</h2>
                        <div className="flex gap-2 ml-auto">
                            <button onClick={onRefresh} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Refresh balance">
                                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                            <button onClick={handleCopyAddress} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Copy address">
                                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                            <button onClick={() => setShowQRModal(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Show QR code">
                                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600 mb-1">Your balance</p>
                            {showBalance ? (
                                <p className="text-3xl font-bold font-mono" onClick={onRefresh}>
                                    ${totalBalance.toFixed(2)}
                                </p>
                            ) : (
                                <p className="text-3xl font-bold">••••••</p>
                            )}
                        </div>
                        <button
                            onClick={() => setShowBalance(!showBalance)}
                            className="px-4 py-2 bg-[#1e3a5f] text-white text-sm font-medium rounded-xl hover:bg-[#2d4a6f] transition"
                        >
                            {showBalance ? 'Hide' : 'Show'}
                        </button>
                    </div>
                </div>

                {/* Send, Load, and Receive Buttons */}
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={isOnline ? onSendMoney : onSendOffline}
                        className="bg-white/60 backdrop-blur-sm rounded-2xl py-4 font-bold text-base text-slate-900 hover:bg-white transition shadow-sm"
                    >
                        Send
                    </button>
                    <button
                        onClick={onReceiveOffline}
                        className="bg-white/60 backdrop-blur-sm rounded-2xl py-4 font-bold text-base text-slate-900 hover:bg-white transition shadow-sm"
                    >
                        Receive
                    </button>
                    <button
                        onClick={onLoadMoney}
                        className="bg-white/60 backdrop-blur-sm rounded-2xl py-4 font-bold text-base text-slate-900 hover:bg-white transition shadow-sm"
                    >
                        Load
                    </button>
                </div>

                {/* Off-line Allowance */}
                <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold mb-2">Off-line allowance</h3>
                    <p className="text-2xl font-bold font-mono mb-4">
                        {showBalance ? `$${Math.max(0, offlineAllowanceLimit - offlineSpent).toFixed(2)}` : '••••••'}
                    </p>

                    {isOnline ? (
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>$0</span>
                                <span className="font-medium">Set offline limit</span>
                                <span>${totalBalance.toFixed(2)}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max={totalBalance}
                                step="0.01"
                                value={offlineAllowanceLimit}
                                onChange={(e) => setOfflineAllowanceLimit(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1e3a5f]"
                            />
                            <div className="text-center text-sm font-medium text-slate-700">
                                ${offlineAllowanceLimit.toFixed(2)}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-100 rounded-xl p-4 text-center">
                            <p className="text-sm text-slate-600 mb-1">Offline mode</p>
                            <p className="text-lg font-bold text-slate-900">
                                Limit locked at ${offlineAllowanceLimit.toFixed(2)}
                            </p>
                            {offlineSpent > 0 && (
                                <p className="text-xs text-slate-500 mt-2">
                                    Spent: ${offlineSpent.toFixed(2)}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Assets List - Only show if balance > 0 */}
                {(parseFloat(balance.ethBalance) > 0 || parseFloat(balance.cbBtcBalance) > 0 || parseFloat(balance.eurcBalance) > 0 || parseFloat(balance.onChain) > 0) && (
                    <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold mb-4">Assets</h3>
                        <div className="space-y-4">
                            {parseFloat(balance.onChain) > 0 && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                                            $
                                        </div>
                                        <div>
                                            <p className="font-bold">USDC</p>
                                            <p className="text-xs text-slate-500">USDC</p>
                                        </div>
                                    </div>
                                    <p className="font-mono font-bold">
                                        {showBalance ? balance.onChain : '••••••'}
                                    </p>
                                </div>
                            )}
                            {parseFloat(balance.ethBalance) > 0 && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                                            Ξ
                                        </div>
                                        <div>
                                            <p className="font-bold">Ethereum</p>
                                            <p className="text-xs text-slate-500">ETH</p>
                                        </div>
                                    </div>
                                    <p className="font-mono font-bold">
                                        {showBalance ? balance.ethBalance : '••••••'}
                                    </p>
                                </div>
                            )}
                            {parseFloat(balance.cbBtcBalance) > 0 && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                                            ₿
                                        </div>
                                        <div>
                                            <p className="font-bold">Coinbase BTC</p>
                                            <p className="text-xs text-slate-500">cbBTC</p>
                                        </div>
                                    </div>
                                    <p className="font-mono font-bold">
                                        {showBalance ? balance.cbBtcBalance : '••••••'}
                                    </p>
                                </div>
                            )}
                            {parseFloat(balance.eurcBalance) > 0 && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                                            €
                                        </div>
                                        <div>
                                            <p className="font-bold">Euro Coin</p>
                                            <p className="text-xs text-slate-500">EURC</p>
                                        </div>
                                    </div>
                                    <p className="font-mono font-bold">
                                        {showBalance ? balance.eurcBalance : '••••••'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Transaction History */}
                <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 shadow-sm min-h-[200px]">
                    <h3 className="text-lg font-bold mb-4">Transaction history</h3>
                    <button
                        onClick={onViewHistory}
                        className="text-sm text-slate-600 hover:text-slate-900 underline"
                    >
                        View all transactions →
                    </button>
                </div>
            </div>
            </div>

            {/* QR Code Modal */}
            {showQRModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm animate-slide-up shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold font-serif">Your QR Code</h3>
                            <button
                                onClick={() => setShowQRModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 mb-4 flex justify-center">
                            <QRCodeSVG
                                value={address}
                                size={240}
                                level="M"
                                className="rounded-lg"
                            />
                        </div>

                        <div className="text-center space-y-2">
                            <p className="text-sm text-slate-500 font-mono break-all bg-slate-50 p-3 rounded-xl">
                                {address}
                            </p>
                            <p className="text-xs text-slate-400">
                                Scan to send money to this wallet
                            </p>
                        </div>

                        <button
                            onClick={() => setShowQRModal(false)}
                            className="w-full mt-6 bg-[#1e3a5f] text-white font-bold py-3 rounded-xl hover:bg-[#2d4a6f] transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* Wallet List Modal */}
            {showWalletList && (
                <WalletList
                    activeWalletId={activeWalletId}
                    onWalletChange={handleWalletChange}
                    onClose={() => setShowWalletList(false)}
                />
            )}
        </div>
    );
}
