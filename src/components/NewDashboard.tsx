import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BalanceState } from '../hooks/useBalance';
import toast from 'react-hot-toast';

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
    const [showBalance, setShowBalance] = useState(true);
    const [showQRModal, setShowQRModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [editingAllowance, setEditingAllowance] = useState(false);
    const [allowanceInput, setAllowanceInput] = useState('');

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const handleCopyAddress = async () => {
        try {
            await navigator.clipboard.writeText(address);
            toast.success('Address copied!');
        } catch (err) {
            toast.error('Failed to copy');
        }
    };

    const handleUpdateAllowance = () => {
        // In a real app, this would actually move funds to a separate "offline" vault
        // For now, we just simulate the UI interaction
        toast.success(`Offline allowance updated to $${allowanceInput}`);
        setEditingAllowance(false);
    };

    const totalBalance = parseFloat(balance.onChain) + parseFloat(balance.offlineReceived) - parseFloat(balance.offlineSent);
    const pendingAmount = parseFloat(balance.offlineReceived) - parseFloat(balance.offlineSent);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
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

            {/* Top Bar */}
            <div className="bg-white px-6 pt-6 pb-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <button onClick={() => setShowMenu(true)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
                    <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">justin</h1>

                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    <span className="text-xs font-bold uppercase tracking-wide">{isOnline ? 'Online' : 'Offline'}</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-6 py-6 space-y-6">

                {/* Account Card */}
                <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl" />

                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                            <div>
                                <p className="text-slate-400 text-sm font-medium mb-1">Total Balance</p>
                                <div className="flex items-baseline gap-2" onClick={onRefresh}>
                                    {balance.isLoading ? (
                                        <div className="h-10 w-32 bg-white/10 rounded animate-pulse" />
                                    ) : (
                                        <h2 className="text-4xl font-zilla font-bold">
                                            {showBalance ? `$${totalBalance.toFixed(2)}` : '••••••'}
                                        </h2>
                                    )}
                                    <span className="text-slate-400 font-sans">USD</span>
                                </div>
                            </div>
                            {!isOnline && pendingAmount !== 0 && (
                                <p className="text-xs text-amber-400 mt-1 font-medium">
                                    {pendingAmount > 0 ? '+' : ''}{pendingAmount.toFixed(2)} pending sync
                                </p>
                            )}
                        </div>

                        <button onClick={() => setShowBalance(!showBalance)} className="text-white/50 hover:text-white">
                            {showBalance ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            )}
                        </button>
                    </div>

                    {/* Coin List */}
                    <div className="space-y-3 relative z-10">
                        <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                                    $
                                </div>
                                <div>
                                    <p className="text-sm font-bold">USDC</p>
                                    <p className="text-xs text-slate-400">USD Coin</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-mono font-medium">
                                    {showBalance ? totalBalance.toFixed(2) : '••••'}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {showBalance ? `$${totalBalance.toFixed(2)}` : '••••'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors opacity-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-xs">
                                    Ξ
                                </div>
                                <div>
                                    <p className="text-sm font-bold">ETH</p>
                                    <p className="text-xs text-slate-400">Ethereum</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-mono font-medium">
                                    {showBalance ? '0.0000' : '••••'}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {showBalance ? '$0.00' : '••••'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#eaff7b] to-[#4bf2e6] flex items-center justify-center text-slate-900 font-bold text-xs">
                                {accountName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">{accountName}</p>
                                <p className="text-xs text-white/60 font-mono">{formatAddress(address)}</p>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={handleCopyAddress} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                            <button onClick={() => setShowQRModal(true)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Offline Allowance Quick Edit */}
                <div className="bg-white border border-slate-100 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Offline Allowance</p>
                            {editingAllowance ? (
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-slate-400">$</span>
                                    <input
                                        type="number"
                                        value={allowanceInput}
                                        onChange={(e) => setAllowanceInput(e.target.value)}
                                        className="w-20 border-b border-slate-300 focus:border-slate-900 outline-none font-bold text-slate-900 p-0"
                                        autoFocus
                                        onBlur={handleUpdateAllowance}
                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateAllowance()}
                                    />
                                </div>
                            ) : (
                                <p className="text-xl font-bold text-slate-900 font-zilla cursor-pointer hover:text-amber-600 transition-colors" onClick={() => { setAllowanceInput(balance.available); setEditingAllowance(true); }}>
                                    ${balance.available}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => { setAllowanceInput(balance.available); setEditingAllowance(true); }}
                        className="text-slate-400 hover:text-slate-600 p-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                </div>

                {/* Unified Send Button */}
                <button
                    onClick={isOnline ? onSendMoney : onSendOffline}
                    className="w-full bg-slate-900 text-white p-5 rounded-2xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-between group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-lg">Send Money</p>
                            <p className="text-white/60 text-sm">
                                {isOnline ? 'Online & Offline capable' : 'Offline Mode Active'}
                            </p>
                        </div>
                    </div>
                    <svg className="w-6 h-6 text-white/40 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={onReceiveOffline} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all text-left">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </div>
                        <p className="font-bold text-slate-900">Receive</p>
                        <p className="text-xs text-slate-500">Offline Voucher</p>
                    </button>

                    <button onClick={onLoadMoney} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all text-left">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <p className="font-bold text-slate-900">Load Cash</p>
                        <p className="text-xs text-slate-500">Test Faucet</p>
                    </button>
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
                            className="w-full mt-6 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
