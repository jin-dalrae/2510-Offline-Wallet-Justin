/**
 * Unified signer type covering both EOA wallets (held in-app via
 * an ethers.Wallet) and Coinbase Smart Wallets (wrapped as an
 * ethers.JsonRpcSigner around the Coinbase SDK provider).
 *
 * All three variants expose the same surface we actually use:
 *   - `.address` (synchronous)
 *   - `.signTypedData(domain, types, value)`
 *   - `.sendTransaction(...)` (via Contract methods)
 *   - `.signMessage(...)`
 *
 * So most call sites need no changes beyond accepting the wider type.
 */

import { ethers } from 'ethers';

export type JustinSigner =
    | ethers.HDNodeWallet
    | ethers.Wallet
    | ethers.JsonRpcSigner;

/**
 * Make sure a signer is connected to a provider that can broadcast
 * transactions. Smart-wallet (`JsonRpcSigner`) signers are already
 * bound to their own provider. EOA (`Wallet`) signers may have been
 * created without one and need to be connected before they can send.
 */
export function ensureSignerHasProvider(
    signer: JustinSigner,
    fallbackProvider: ethers.Provider
): JustinSigner {
    if (signer.provider) return signer;
    return (signer as ethers.Wallet).connect(fallbackProvider);
}

/** Discriminator for code that needs to branch on wallet kind. */
export type WalletKind = 'eoa' | 'smart';

export function walletKindOf(signer: JustinSigner): WalletKind {
    return signer instanceof ethers.JsonRpcSigner ? 'smart' : 'eoa';
}
