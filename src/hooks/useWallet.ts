import { useState, useEffect, useCallback, useRef } from 'react';
import { WalletManager } from '../lib/wallet';
import { storage } from '../lib/storage';
import { ethers } from 'ethers';

// sessionStorage holds the password for the current tab session only.
// It clears automatically when the tab is closed. This is the auto-unlock
// mechanism on reload — never a hardcoded fallback.
const SESSION_PASSWORD_KEY = 'wallet_session_password';
// localStorage signal so other tabs in the same browser session can notice
// login/logout. Does NOT contain credentials.
const SESSION_FLAG_KEY = 'wallet_session_active';

export interface WalletState {
    isInitialized: boolean;
    isUnlocked: boolean;
    address: string | null;
    accountName: string | null;
    profilePicture: string | null;
    walletManager: WalletManager | null;
}

const INITIAL_STATE: WalletState = {
    isInitialized: false,
    isUnlocked: false,
    address: null,
    accountName: null,
    profilePicture: null,
    walletManager: null,
};

export function useWallet() {
    const [state, setState] = useState<WalletState>(INITIAL_STATE);
    const hasAutoUnlocked = useRef(false);

    const applyUnlocked = useCallback(
        (
            walletData: { address: string; accountName?: string; profilePicture?: string },
            walletManager: WalletManager
        ) => {
            setState({
                isInitialized: true,
                isUnlocked: true,
                address: walletData.address,
                accountName: walletData.accountName ?? 'My Wallet',
                profilePicture: walletData.profilePicture ?? null,
                walletManager,
            });
        },
        []
    );

    // On mount: load wallet metadata; auto-unlock if a session password exists.
    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            try {
                await storage.init();
                const walletData = await storage.getWallet();

                if (!walletData) {
                    if (!cancelled) {
                        setState({ ...INITIAL_STATE, isInitialized: true });
                    }
                    return;
                }

                const sessionPassword = sessionStorage.getItem(SESSION_PASSWORD_KEY);
                if (sessionPassword && !hasAutoUnlocked.current) {
                    hasAutoUnlocked.current = true;
                    try {
                        const wm = new WalletManager();
                        await wm.unlock(walletData.encryptedPrivateKey, sessionPassword);
                        if (!cancelled) applyUnlocked(walletData, wm);
                        return;
                    } catch (err) {
                        console.warn('Auto-unlock failed, clearing session', err);
                        sessionStorage.removeItem(SESSION_PASSWORD_KEY);
                        localStorage.removeItem(SESSION_FLAG_KEY);
                    }
                }

                if (!cancelled) {
                    setState({
                        isInitialized: true,
                        isUnlocked: false,
                        address: walletData.address,
                        accountName: walletData.accountName ?? 'My Wallet',
                        profilePicture: walletData.profilePicture ?? null,
                        walletManager: null,
                    });
                }
            } catch (error) {
                console.error('Error checking wallet:', error);
                if (!cancelled) setState({ ...INITIAL_STATE, isInitialized: true });
            }
        };

        init();
        return () => {
            cancelled = true;
        };
    }, [applyUnlocked]);

    // Cross-tab logout: if another tab clears the session flag, lock this tab too.
    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key === SESSION_FLAG_KEY && event.newValue === null) {
                state.walletManager?.lock();
                sessionStorage.removeItem(SESSION_PASSWORD_KEY);
                setState((prev) => ({ ...prev, isUnlocked: false, walletManager: null }));
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [state.walletManager]);

    /**
     * Create a brand-new wallet entry from a private key, encrypted with the user's password.
     * Replaces any existing wallet on the device.
     */
    const createWallet = useCallback(
        async (accountName: string, privateKey: string, password: string): Promise<void> => {
            if (!password) throw new Error('Password is required');

            const wallet = WalletManager.fromPrivateKey(privateKey);
            const encryptedPrivateKey = await WalletManager.encryptPrivateKey(privateKey, password);

            // Reset any prior wallet on this device so there's exactly one record.
            await storage.deleteActiveWallet();
            const walletId = await storage.addWallet(wallet.address, encryptedPrivateKey, accountName);
            await storage.setActiveWallet(walletId);

            const wm = new WalletManager();
            await wm.unlock(encryptedPrivateKey, password);

            sessionStorage.setItem(SESSION_PASSWORD_KEY, password);
            localStorage.setItem(SESSION_FLAG_KEY, 'true');

            applyUnlocked(
                { address: wallet.address, accountName, profilePicture: undefined },
                wm
            );
        },
        [applyUnlocked]
    );

    /**
     * Sign in with a stored wallet (decrypt with the provided password).
     */
    const unlockWithPassword = useCallback(
        async (password: string): Promise<void> => {
            if (!password) throw new Error('Password is required');
            const walletData = await storage.getWallet();
            if (!walletData) throw new Error('No wallet on this device');

            const wm = new WalletManager();
            await wm.unlock(walletData.encryptedPrivateKey, password);

            sessionStorage.setItem(SESSION_PASSWORD_KEY, password);
            localStorage.setItem(SESSION_FLAG_KEY, 'true');

            applyUnlocked(walletData, wm);
        },
        [applyUnlocked]
    );

    /**
     * Import a wallet from private key or mnemonic + a new password.
     * The password is what will be used to unlock the wallet on this device going forward.
     */
    const importWallet = useCallback(
        async (keyOrMnemonic: string, password: string, accountName = 'Imported Wallet'): Promise<void> => {
            if (!password) throw new Error('Password is required');

            const wallet = keyOrMnemonic.trim().includes(' ')
                ? WalletManager.fromMnemonic(keyOrMnemonic.trim())
                : WalletManager.fromPrivateKey(keyOrMnemonic.trim());

            await createWallet(accountName, wallet.privateKey, password);
        },
        [createWallet]
    );

    const logout = useCallback(() => {
        state.walletManager?.lock();
        sessionStorage.removeItem(SESSION_PASSWORD_KEY);
        localStorage.removeItem(SESSION_FLAG_KEY);
        setState((prev) => ({ ...prev, isUnlocked: false, walletManager: null }));
    }, [state.walletManager]);

    const getWallet = useCallback((): ethers.HDNodeWallet | ethers.Wallet => {
        if (!state.walletManager || !state.isUnlocked) {
            throw new Error('Wallet is locked');
        }
        return state.walletManager.getWallet();
    }, [state.walletManager, state.isUnlocked]);

    const updateProfile = useCallback(
        async (name?: string, picture?: string | null) => {
            await storage.updateWalletProfile(name, picture === null ? null : picture);
            setState((prev) => ({
                ...prev,
                ...(name !== undefined && { accountName: name }),
                ...(picture !== undefined && { profilePicture: picture ?? null }),
            }));
        },
        []
    );

    return {
        ...state,
        createWallet,
        unlockWithPassword,
        importWallet,
        logout,
        getWallet,
        updateProfile,
    };
}
