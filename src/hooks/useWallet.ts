import { useState, useEffect, useCallback } from 'react';
import { WalletManager } from '../lib/wallet';
import { storage } from '../lib/storage';
import { ethers } from 'ethers';

export interface WalletState {
    isInitialized: boolean;
    isUnlocked: boolean;
    address: string | null;
    accountName: string | null;
    profilePicture: string | null;
    walletManager: WalletManager | null;
}

export function useWallet() {
    const [state, setState] = useState<WalletState>({
        isInitialized: false,
        isUnlocked: false,
        address: null,
        accountName: null,
        profilePicture: null,
        walletManager: null,
    });

    // Check if wallet exists in storage
    useEffect(() => {
        const checkWallet = async () => {
            try {
                await storage.init();
                const walletData = await storage.getWallet();

                if (walletData) {
                    setState({
                        isInitialized: true,
                        isUnlocked: false, // Always start locked for security
                        address: walletData.address,
                        accountName: walletData.accountName || 'My Wallet',
                        profilePicture: walletData.profilePicture || null,
                        walletManager: null,
                    });
                }
            } catch (error) {
                console.error('Error checking wallet:', error);
            }
        };

        checkWallet();
    }, []);

    const createWallet = useCallback(
        async (accountName: string, privateKey: string): Promise<void> => {
            // For this simplified flow, we'll use a default password since the user
            // wants to "sign in with keys" rather than a password.
            // In a real app, we'd want a user-provided password.
            const defaultPassword = 'default-password-for-demo';

            const wallet = WalletManager.fromPrivateKey(privateKey);
            const encryptedPrivateKey = await WalletManager.encryptPrivateKey(
                privateKey,
                defaultPassword
            );

            await storage.saveWallet(wallet.address, encryptedPrivateKey, accountName);

            const walletManager = new WalletManager();
            await walletManager.unlock(encryptedPrivateKey, defaultPassword);

            setState({
                isInitialized: true,
                isUnlocked: true,
                address: wallet.address,
                accountName,
                profilePicture: null,
                walletManager,
            });
        },
        []
    );

    const loginWithKey = useCallback(
        async (keyOrMnemonic: string): Promise<void> => {
            const defaultPassword = 'default-password-for-demo';
            let wallet;

            // Check if input is mnemonic (has spaces) or private key
            if (keyOrMnemonic.includes(' ')) {
                wallet = WalletManager.fromMnemonic(keyOrMnemonic);
            } else {
                wallet = WalletManager.fromPrivateKey(keyOrMnemonic);
            }

            // Check if this matches stored wallet, if so just unlock
            const storedWallet = await storage.getWallet();

            if (storedWallet && storedWallet.address === wallet.address) {
                const walletManager = new WalletManager();
                await walletManager.unlock(storedWallet.encryptedPrivateKey, defaultPassword);

                setState({
                    isInitialized: true,
                    isUnlocked: true,
                    address: wallet.address,
                    accountName: storedWallet.accountName || 'My Wallet',
                    profilePicture: storedWallet.profilePicture || null,
                    walletManager,
                });
            } else {
                // New login
                const encryptedPrivateKey = await WalletManager.encryptPrivateKey(
                    wallet.privateKey,
                    defaultPassword
                );

                const accountName = 'Imported Wallet';
                await storage.saveWallet(wallet.address, encryptedPrivateKey, accountName);

                const walletManager = new WalletManager();
                await walletManager.unlock(encryptedPrivateKey, defaultPassword);

                setState({
                    isInitialized: true,
                    isUnlocked: true,
                    address: wallet.address,
                    accountName,
                    profilePicture: null,
                    walletManager,
                });
            }
        },
        []
    );

    const logout = useCallback(() => {
        if (state.walletManager) {
            state.walletManager.lock();
        }
        setState(prev => ({
            ...prev,
            isUnlocked: false,
            walletManager: null
        }));
    }, [state.walletManager]);

    const getWallet = useCallback((): ethers.HDNodeWallet | ethers.Wallet => {
        if (!state.walletManager || !state.isUnlocked) {
            throw new Error('Wallet is locked');
        }
        return state.walletManager.getWallet();
    }, [state]);

    const updateProfile = useCallback(async (name?: string, picture?: string | null) => {
        try {
            await storage.updateWalletProfile(name, picture === null ? null : picture || undefined);
            setState(prev => ({
                ...prev,
                ...(name !== undefined && { accountName: name }),
                ...(picture !== undefined && { profilePicture: picture }),
            }));
        } catch (error) {
            console.error('Failed to update profile:', error);
            throw error;
        }
    }, []);

    return {
        ...state,
        createWallet,
        loginWithKey,
        logout,
        getWallet,
        updateProfile,
    };
}
