import { useState, useEffect, useCallback } from 'react';
import { settlement, SettlementResult } from '../lib/settlement';
import { firebase } from '../lib/firebase';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

export interface SettlementState {
    isSettling: boolean;
    progress: { current: number; total: number; status: string } | null;
    lastResults: SettlementResult[];
}

export function useSettlement(
    address: string | null,
    getWallet: () => ethers.HDNodeWallet | ethers.Wallet,
    isOnline: boolean
) {
    const [state, setState] = useState<SettlementState>({
        isSettling: false,
        progress: null,
        lastResults: [],
    });

    const [lastOnlineState, setLastOnlineState] = useState(isOnline);

    // Trigger settlement when going online
    useEffect(() => {
        if (!lastOnlineState && isOnline && address) {
            // Just went online
            console.log('Device went online, checking for pending settlements...');
            setTimeout(() => {
                handleSettlement();
            }, 2000); // Small delay to ensure connection is stable
        }

        setLastOnlineState(isOnline);
    }, [isOnline, address]);

    const handleSettlement = useCallback(async () => {
        if (!address || !isOnline) {
            console.log('Cannot settle: offline or no address');
            return;
        }

        try {
            const wallet = getWallet();

            setState((prev) => ({ ...prev, isSettling: true }));

            // Sync with Firebase first
            await firebase.initialize();
            await settlement.syncWithFirebase(address);

            // Settle pending transactions
            const results = await settlement.settlePendingTransactions(
                wallet,
                (current, total, status) => {
                    setState((prev) => ({
                        ...prev,
                        progress: { current, total, status },
                    }));
                }
            );

            // Show toast notifications for results
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;

            if (successCount > 0) {
                toast.success(`Settled ${successCount} transaction${successCount > 1 ? 's' : ''} successfully!`);
            }
            if (failCount > 0) {
                toast.error(`${failCount} transaction${failCount > 1 ? 's' : ''} failed to settle.`);
            }

            setState({
                isSettling: false,
                progress: null,
                lastResults: results,
            });

            return results;
        } catch (error) {
            console.error('Settlement error:', error);
            setState({
                isSettling: false,
                progress: null,
                lastResults: [
                    { success: false, error: (error as Error).message },
                ],
            });
        }
    }, [address, getWallet, isOnline]);

    return {
        ...state,
        settle: handleSettlement,
    };
}
