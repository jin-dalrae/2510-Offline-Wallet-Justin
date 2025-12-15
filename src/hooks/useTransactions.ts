import { useState, useEffect, useCallback } from 'react';
import { storage } from '../lib/storage';
import {
    blockchain,
    USDC_CONTRACT_ADDRESS,
    CBBTC_CONTRACT_ADDRESS,
    EURC_CONTRACT_ADDRESS,
} from '../lib/blockchain';

export interface DisplayTransaction {
    id: string;
    type: 'sent' | 'received';
    from: string;
    to: string;
    amount: string;
    timestamp: number;
    status: 'pending' | 'settled' | 'failed';
    txHash?: string;
    source: 'local' | 'chain';
    tokenSymbol: string;
}

export function useTransactions(address: string, isOnline: boolean) {
    const [transactions, setTransactions] = useState<DisplayTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const getTokenSymbol = (addr: string) => {
        switch (addr.toLowerCase()) {
            case USDC_CONTRACT_ADDRESS.toLowerCase(): return 'USDC';
            case CBBTC_CONTRACT_ADDRESS.toLowerCase(): return 'cbBTC';
            case EURC_CONTRACT_ADDRESS.toLowerCase(): return 'EURC';
            default: return 'Token';
        }
    };

    const loadTransactions = useCallback(async () => {
        if (!address) return;
        setIsLoading(true);

        try {
            // Get local pending transactions
            const pendingTxs = await storage.getPendingTransactions();
            const localTxs: DisplayTransaction[] = pendingTxs.map((tx) => ({
                id: tx.id,
                type: tx.type,
                from: tx.from,
                to: tx.to,
                amount: tx.amount,
                timestamp: tx.timestamp,
                status: tx.status,
                txHash: tx.txHash,
                source: 'local',
                tokenSymbol: tx.voucherData?.token || 'USDC',
            }));

            let chainTxs: DisplayTransaction[] = [];

            // Get on-chain transactions if online
            if (isOnline) {
                try {
                    const [usdcTxs, cbBtcTxs, eurcTxs] = await Promise.all([
                        blockchain.getRecentERC20Transactions(USDC_CONTRACT_ADDRESS, address),
                        blockchain.getRecentERC20Transactions(CBBTC_CONTRACT_ADDRESS, address),
                        blockchain.getRecentERC20Transactions(EURC_CONTRACT_ADDRESS, address),
                    ]);

                    const mapToDisplay = (txs: any[], tokenAddr: string) => txs.map((tx: any) => ({
                        id: tx.hash + tokenAddr,
                        type: tx.type as 'sent' | 'received',
                        from: tx.from,
                        to: tx.to,
                        amount: tx.amount,
                        timestamp: tx.timestamp * 1000,
                        status: 'settled' as const,
                        txHash: tx.hash,
                        source: 'chain' as const,
                        tokenSymbol: getTokenSymbol(tokenAddr),
                    }));

                    chainTxs = [
                        ...mapToDisplay(usdcTxs, USDC_CONTRACT_ADDRESS),
                        ...mapToDisplay(cbBtcTxs, CBBTC_CONTRACT_ADDRESS),
                        ...mapToDisplay(eurcTxs, EURC_CONTRACT_ADDRESS),
                    ];
                } catch (error) {
                    console.error('Error loading chain transactions:', error);
                }
            }

            // Combine and deduplicate
            const allTxs = [...localTxs, ...chainTxs];
            const uniqueTxs = Array.from(
                new Map(
                    allTxs.map((tx) => {
                        const key = tx.txHash
                            ? `${tx.txHash}-${tx.tokenSymbol}`.toLowerCase()
                            : tx.id;
                        return [key, tx];
                    })
                ).values()
            );

            // Sort by timestamp (newest first)
            uniqueTxs.sort((a, b) => b.timestamp - a.timestamp);

            setTransactions(uniqueTxs);
        } catch (error) {
            console.error('Error loading transactions:', error);
        } finally {
            setIsLoading(false);
        }
    }, [address, isOnline]);

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    return { transactions, isLoading, refresh: loadTransactions };
}
