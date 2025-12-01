import { useState, useEffect, useCallback } from 'react';
import { blockchain } from '../lib/blockchain';
import { storage } from '../lib/storage';


export interface BalanceState {
    onChain: string;
    offlineSent: string;
    offlineReceived: string;
    available: string;
    ethBalance: string;
    isLoading: boolean;
}

export function useBalance(address: string | null, isOnline: boolean) {
    const [balance, setBalance] = useState<BalanceState>({
        onChain: '0',
        offlineSent: '0',
        offlineReceived: '0',
        available: '0',
        ethBalance: '0',
        isLoading: true,
    });

    const refreshBalance = useCallback(async () => {
        if (!address) {
            setBalance({
                onChain: '0',
                offlineSent: '0',
                offlineReceived: '0',
                available: '0',
                ethBalance: '0',
                isLoading: false,
            });
            return;
        }

        setBalance((prev) => ({ ...prev, isLoading: true }));

        try {
            // Get offline balances from local storage
            const offlineBalances = await storage.getOfflineBalances();

            let onChainBalance = '0';
            let ethBalance = '0';

            // Only fetch on-chain balance if online
            if (isOnline) {
                try {
                    [onChainBalance, ethBalance] = await Promise.all([
                        blockchain.getUSDCBalance(address),
                        blockchain.getEthBalance(address),
                    ]);
                } catch (error) {
                    console.error('Error fetching on-chain balance:', error);
                }
            }

            // Calculate available balance
            const onChainNum = parseFloat(onChainBalance);
            const sentNum = parseFloat(offlineBalances.sent);
            const receivedNum = parseFloat(offlineBalances.received);

            const available = Math.max(0, onChainNum - sentNum).toFixed(6);

            setBalance({
                onChain: parseFloat(onChainBalance).toFixed(6),
                offlineSent: sentNum.toFixed(6),
                offlineReceived: receivedNum.toFixed(6),
                available,
                ethBalance: parseFloat(ethBalance).toFixed(6),
                isLoading: false,
            });
        } catch (error) {
            console.error('Error refreshing balance:', error);
            setBalance((prev) => ({ ...prev, isLoading: false }));
        }
    }, [address, isOnline]);

    useEffect(() => {
        refreshBalance();

        // Auto-refresh every 60 seconds when online
        if (isOnline) {
            const interval = setInterval(refreshBalance, 60000);
            return () => clearInterval(interval);
        }
    }, [refreshBalance, isOnline]);

    return {
        balance,
        refreshBalance,
    };
}
