import { useState, useEffect, useCallback, useRef } from 'react';
import { WalletManager } from '../lib/wallet';
import { storage } from '../lib/storage';
import { JustinSigner, WalletKind } from '../lib/signer';
import {
    connectSmartWallet,
    restoreSmartWalletSession,
    disconnectSmartWallet,
} from '../lib/smartWallet';
import {
    getSessionSecret,
    setSessionSecret,
    clearSessionSecret,
} from '../lib/secureSession';

// Session-only cache: lets us re-unlock an EOA wallet on tab reload without
// re-prompting for the password. The password is encrypted under a
// non-extractable key (see secureSession.ts) — never stored in plaintext —
// and is gone when the webview/tab is torn down.
// Cross-tab login/logout signal (no credentials in this one).
const SESSION_FLAG_KEY = 'wallet_session_active';
// Sticky flag for which wallet kind to prefer on next restore.
const KIND_FLAG_KEY = 'wallet_kind';

export interface WalletState {
    isInitialized: boolean;
    isUnlocked: boolean;
    kind: WalletKind | null;
    address: string | null;
    accountName: string | null;
    profilePicture: string | null;
    // The active signer when isUnlocked. Held in a ref to avoid stale-closure
    // issues; consumers should call getSigner() rather than reading from state.
}

const INITIAL_STATE: WalletState = {
    isInitialized: false,
    isUnlocked: false,
    kind: null,
    address: null,
    accountName: null,
    profilePicture: null,
};

export function useWallet() {
    const [state, setState] = useState<WalletState>(INITIAL_STATE);
    const hasAutoUnlocked = useRef(false);

    // Hold the active signer in a ref to keep references stable across renders.
    const signerRef = useRef<JustinSigner | null>(null);
    // EOA-only: keep the WalletManager so we can re-lock cleanly on logout.
    const eoaManagerRef = useRef<WalletManager | null>(null);

    const applyEoa = useCallback(
        (
            walletData: { address: string; accountName?: string; profilePicture?: string },
            wm: WalletManager
        ) => {
            eoaManagerRef.current = wm;
            signerRef.current = wm.getWallet();
            localStorage.setItem(KIND_FLAG_KEY, 'eoa');
            setState({
                isInitialized: true,
                isUnlocked: true,
                kind: 'eoa',
                address: walletData.address,
                accountName: walletData.accountName ?? 'My Wallet',
                profilePicture: walletData.profilePicture ?? null,
            });
        },
        []
    );

    const applySmart = useCallback(
        (address: string, signer: JustinSigner) => {
            eoaManagerRef.current = null;
            signerRef.current = signer;
            localStorage.setItem(KIND_FLAG_KEY, 'smart');
            setState({
                isInitialized: true,
                isUnlocked: true,
                kind: 'smart',
                address,
                accountName: 'Smart Wallet',
                profilePicture: null,
            });
        },
        []
    );

    // On mount: try to restore the previously-active wallet without prompting.
    // Order: smart wallet (silent) → EOA (via cached session password) → locked.
    useEffect(() => {
        let cancelled = false;

        const restore = async () => {
            try {
                await storage.init();
                const preferredKind = localStorage.getItem(KIND_FLAG_KEY) as WalletKind | null;

                // 1. Smart wallet session can be restored silently if it exists.
                if (preferredKind === 'smart' || preferredKind === null) {
                    const smart = await restoreSmartWalletSession();
                    if (smart && !cancelled) {
                        applySmart(smart.address, smart.signer);
                        return;
                    }
                    // If we expected smart but it's gone, fall through to EOA check.
                }

                // 2. EOA path: any local wallet data we can auto-unlock?
                const walletData = await storage.getWallet();
                if (!walletData) {
                    if (!cancelled) setState({ ...INITIAL_STATE, isInitialized: true });
                    return;
                }

                const sessionPassword = await getSessionSecret();
                if (sessionPassword && !hasAutoUnlocked.current) {
                    hasAutoUnlocked.current = true;
                    try {
                        const wm = new WalletManager();
                        await wm.unlock(walletData.encryptedPrivateKey, sessionPassword);
                        if (!cancelled) applyEoa(walletData, wm);
                        return;
                    } catch (err) {
                        console.warn('EOA auto-unlock failed, clearing session', err);
                        clearSessionSecret();
                        localStorage.removeItem(SESSION_FLAG_KEY);
                    }
                }

                if (!cancelled) {
                    setState({
                        isInitialized: true,
                        isUnlocked: false,
                        kind: null,
                        address: walletData.address,
                        accountName: walletData.accountName ?? 'My Wallet',
                        profilePicture: walletData.profilePicture ?? null,
                    });
                }
            } catch (error) {
                console.error('Error restoring wallet:', error);
                if (!cancelled) setState({ ...INITIAL_STATE, isInitialized: true });
            }
        };

        restore();
        return () => {
            cancelled = true;
        };
    }, [applyEoa, applySmart]);

    // Cross-tab logout: if another tab clears the session flag, lock here too.
    useEffect(() => {
        const handler = (event: StorageEvent) => {
            if (event.key === SESSION_FLAG_KEY && event.newValue === null) {
                eoaManagerRef.current?.lock();
                signerRef.current = null;
                clearSessionSecret();
                setState((prev) => ({ ...prev, isUnlocked: false, kind: null }));
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    /**
     * Sign up flow: create a brand-new EOA wallet from a private key,
     * encrypted with the user's chosen password.
     */
    const createWallet = useCallback(
        async (accountName: string, privateKey: string, password: string): Promise<void> => {
            if (!password) throw new Error('Password is required');

            const wallet = WalletManager.fromPrivateKey(privateKey);
            const encryptedPrivateKey = await WalletManager.encryptPrivateKey(privateKey, password);

            await storage.deleteActiveWallet();
            const walletId = await storage.addWallet(wallet.address, encryptedPrivateKey, accountName);
            await storage.setActiveWallet(walletId);

            const wm = new WalletManager();
            await wm.unlock(encryptedPrivateKey, password);

            await setSessionSecret(password);
            localStorage.setItem(SESSION_FLAG_KEY, 'true');

            applyEoa({ address: wallet.address, accountName, profilePicture: undefined }, wm);
        },
        [applyEoa]
    );

    /** Sign in with the stored EOA wallet using its password. */
    const unlockWithPassword = useCallback(
        async (password: string): Promise<void> => {
            if (!password) throw new Error('Password is required');
            const walletData = await storage.getWallet();
            if (!walletData) throw new Error('No wallet on this device');

            const wm = new WalletManager();
            await wm.unlock(walletData.encryptedPrivateKey, password);

            await setSessionSecret(password);
            localStorage.setItem(SESSION_FLAG_KEY, 'true');

            applyEoa(walletData, wm);
        },
        [applyEoa]
    );

    /** Import a wallet from a private key or mnemonic, encrypted with a new password. */
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

    /**
     * Connect (or create) a Coinbase Smart Wallet via Face ID. The SDK
     * handles passkey creation, ERC-4337 deployment, and session
     * persistence. We just receive an address + signer.
     */
    const connectSmart = useCallback(async (): Promise<void> => {
        const { address, signer } = await connectSmartWallet();
        applySmart(address, signer);
    }, [applySmart]);

    const logout = useCallback(async () => {
        eoaManagerRef.current?.lock();
        if (state.kind === 'smart') {
            await disconnectSmartWallet().catch(() => undefined);
        }
        signerRef.current = null;
        eoaManagerRef.current = null;
        clearSessionSecret();
        localStorage.removeItem(SESSION_FLAG_KEY);
        localStorage.removeItem(KIND_FLAG_KEY);
        setState((prev) => ({ ...prev, isUnlocked: false, kind: null }));
    }, [state.kind]);

    /**
     * Return the active signer. Throws if no wallet is unlocked.
     */
    const getSigner = useCallback((): JustinSigner => {
        if (!signerRef.current || !state.isUnlocked) {
            throw new Error('Wallet is locked');
        }
        return signerRef.current;
    }, [state.isUnlocked]);

    const updateProfile = useCallback(
        async (name?: string, picture?: string | null) => {
            // Profile metadata is stored locally; only meaningful for EOA wallets.
            if (state.kind !== 'eoa') return;
            await storage.updateWalletProfile(name, picture === null ? null : picture);
            setState((prev) => ({
                ...prev,
                ...(name !== undefined && { accountName: name }),
                ...(picture !== undefined && { profilePicture: picture ?? null }),
            }));
        },
        [state.kind]
    );

    return {
        ...state,
        createWallet,
        unlockWithPassword,
        importWallet,
        connectSmart,
        logout,
        getSigner,
        /** @deprecated use getSigner() */
        getWallet: getSigner,
        updateProfile,
    };
}
