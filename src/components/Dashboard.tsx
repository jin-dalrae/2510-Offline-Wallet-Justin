import { BalanceState } from '../hooks/useBalance';

interface DashboardProps {
    address: string;
    balance: BalanceState;
    isOnline: boolean;
    onSendOffline: () => void;
    onReceiveOffline: () => void;
    onViewHistory: () => void;
    onLock: () => void;
}

export function Dashboard({
    address,
    balance,
    isOnline,
    onSendOffline,
    onReceiveOffline,
    onViewHistory,
    onLock,
}: DashboardProps) {
    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <div className="min-h-screen p-4">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="card">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                                Offline Wallet
                            </h1>
                            <p className="text-gray-400 text-sm mt-1">
                                {formatAddress(address)}
                            </p>
                        </div>
                        <button
                            onClick={onLock}
                            className="text-gray-400 hover:text-white"
                            title="Lock Wallet"
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Network Status */}
                    <div
                        className={
                            isOnline ? 'status-online text-sm' : 'status-offline text-sm'
                        }
                    >
                        <span className="status-dot" />
                        {isOnline ? 'Online' : 'Offline'}
                    </div>
                </div>

                {/* Balance Cards */}
                <div className="grid gap-4">
                    {/* Main Balance */}
                    <div className="card">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-400 text-sm">Available Balance</p>
                                <p className="text-4xl font-bold mt-2">
                                    {balance.isLoading ? (
                                        <span className="shimmer inline-block w-32 h-10 rounded" />
                                    ) : (
                                        <>{balance.available} <span className="text-2xl">USDC</span></>
                                    )}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-400 text-xs">Gas Balance</p>
                                <p className="text-sm">{balance.ethBalance} ETH</p>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Balances */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="card">
                            <p className="text-gray-400 text-xs mb-1">On-Chain</p>
                            <p className="text-lg font-semibold">{balance.onChain}</p>
                        </div>
                        <div className="card">
                            <p className="text-gray-400 text-xs mb-1">Sent (Pending)</p>
                            <p className="text-lg font-semibold text-amber-400">
                                -{balance.offlineSent}
                            </p>
                        </div>
                        <div className="card">
                            <p className="text-gray-400 text-xs mb-1">Received (Pending)</p>
                            <p className="text-lg font-semibold text-green-400">
                                +{balance.offlineReceived}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={onSendOffline} className="btn-primary">
                        <svg
                            className="w-5 h-5 inline-block mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            />
                        </svg>
                        Send Offline
                    </button>

                    <button onClick={onReceiveOffline} className="btn-primary">
                        <svg
                            className="w-5 h-5 inline-block mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16l-4-4m0 0l4-4m-4 4h18"
                            />
                        </svg>
                        Receive Offline
                    </button>
                </div>

                {/* Transaction History Button */}
                <button onClick={onViewHistory} className="btn-secondary w-full">
                    <svg
                        className="w-5 h-5 inline-block mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                    </svg>
                    Transaction History
                </button>

                {/* Help Info */}
                <div className="card bg-primary-500/10 border-primary-500/30">
                    <p className="text-sm text-gray-300">
                        <strong>💡 How it works:</strong> Send money offline by scanning a QR code.
                        When you or the receiver go online, funds will be settled on Base Sepolia.
                    </p>
                </div>
            </div>
        </div>
    );
}
