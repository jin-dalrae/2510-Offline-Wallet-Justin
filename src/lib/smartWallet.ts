/**
 * Coinbase Smart Wallet integration.
 *
 * Coinbase Smart Wallet (the Passkey one) is a smart contract wallet
 * owned by a passkey stored in the device's Secure Enclave. From this
 * app's perspective it exposes a standard EIP-1193 provider, so we wrap
 * it as an ethers BrowserProvider and surface a JsonRpcSigner — same
 * interface our escrow client and blockchain helpers already use.
 *
 * Differences vs an EOA wallet:
 *  - We never see or store a private key. The user authenticates with
 *    Face ID; the SDK handles the rest.
 *  - Signatures are ERC-1271 (smart-contract verified), not ECDSA. Our
 *    OfflineEscrow contract already accepts both via SignatureChecker.
 *  - Transactions are submitted as UserOps via the Coinbase Smart
 *    Wallet bundler — we don't have to manage that.
 */

import { createCoinbaseWalletSDK, ProviderInterface } from '@coinbase/wallet-sdk';
import { ethers } from 'ethers';
import { BASE_SEPOLIA_CONFIG } from './blockchain';

let _sdk: ReturnType<typeof createCoinbaseWalletSDK> | null = null;
let _provider: ProviderInterface | null = null;

function getSDK() {
    if (!_sdk) {
        _sdk = createCoinbaseWalletSDK({
            appName: 'Justin',
            appChainIds: [BASE_SEPOLIA_CONFIG.chainId],
            appLogoUrl: typeof window !== 'undefined'
                ? `${window.location.origin}/justin_logo.svg`
                : '',
            preference: {
                // Force the new smart-wallet UX (Face ID, no seed phrase).
                // Available options: 'all' | 'smartWalletOnly' | 'eoaOnly'.
                options: 'smartWalletOnly',
            },
        });
    }
    return _sdk;
}

/** Lazily get the EIP-1193 provider, creating the SDK if needed. */
export function getSmartWalletProvider(): ProviderInterface {
    if (!_provider) {
        _provider = getSDK().getProvider();
    }
    return _provider;
}

/**
 * Trigger the Coinbase Smart Wallet connect flow.
 *
 * First call on a device shows a Face ID prompt and creates the smart
 * wallet. Subsequent calls reuse the existing wallet for that user.
 *
 * Returns the smart-wallet address and an ethers signer wrapping the
 * EIP-1193 provider. Use the signer like any ethers.Wallet for typed-
 * data signing and transactions.
 */
export async function connectSmartWallet(): Promise<{
    address: string;
    signer: ethers.JsonRpcSigner;
    provider: ProviderInterface;
}> {
    const provider = getSmartWalletProvider();
    const accounts = (await provider.request({
        method: 'eth_requestAccounts',
    })) as string[];

    if (!accounts || accounts.length === 0) {
        throw new Error('Coinbase Smart Wallet returned no accounts');
    }

    const address = accounts[0];

    // Wrap the EIP-1193 provider as an ethers BrowserProvider so the rest
    // of our codebase can keep using the ethers.Signer interface.
    const browserProvider = new ethers.BrowserProvider(
        provider as unknown as ethers.Eip1193Provider
    );
    const signer = await browserProvider.getSigner(address);

    return { address, signer, provider };
}

/**
 * Try to re-attach to an existing Coinbase Smart Wallet session without
 * triggering the Face ID prompt. Returns null if no session is active.
 *
 * The SDK persists session state in localStorage, so on reload we can
 * silently restore the wallet.
 */
export async function restoreSmartWalletSession(): Promise<{
    address: string;
    signer: ethers.JsonRpcSigner;
    provider: ProviderInterface;
} | null> {
    try {
        const provider = getSmartWalletProvider();
        // `eth_accounts` is the silent-check method (vs `eth_requestAccounts`,
        // which always prompts the user).
        const accounts = (await provider.request({
            method: 'eth_accounts',
        })) as string[];

        if (!accounts || accounts.length === 0) return null;

        const address = accounts[0];
        const browserProvider = new ethers.BrowserProvider(
            provider as unknown as ethers.Eip1193Provider
        );
        const signer = await browserProvider.getSigner(address);
        return { address, signer, provider };
    } catch {
        return null;
    }
}

/** Tear down the Coinbase Smart Wallet session. */
export async function disconnectSmartWallet(): Promise<void> {
    try {
        await getSmartWalletProvider().disconnect();
    } finally {
        _provider = null;
        _sdk = null;
    }
}
