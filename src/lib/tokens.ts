/**
 * Token allowlist registry — the single source of truth for which ERC-20s
 * Justin will display or accept, and their canonical decimals.
 *
 * SECURITY: a voucher carries sender-supplied `tokenSymbol` and `humanAmount`
 * fields that are NOT part of the signed EIP-712 message. They must never be
 * trusted for display or accounting. The only trusted values are the signed
 * `token` (an address) and `amount` (base units). This module maps the signed
 * token address to a known symbol + decimals; any token address not in this
 * allowlist is rejected outright, so a malicious sender cannot present a
 * worthless token as "USDC" or inflate the displayed amount.
 */

import { ethers } from 'ethers';
import {
    USDC_CONTRACT_ADDRESS,
    EURC_CONTRACT_ADDRESS,
    CBBTC_CONTRACT_ADDRESS,
} from './blockchain';

export type TokenSymbol = 'USDC' | 'EURC' | 'cbBTC';

export interface TokenInfo {
    symbol: TokenSymbol;
    decimals: number;
    address: string;
}

// Keyed by lowercased address. Built from the env-configured addresses in
// blockchain.ts so testnet/mainnet overrides flow through one place.
const REGISTRY: Record<string, TokenInfo> = {};

function register(symbol: TokenSymbol, decimals: number, address: string): void {
    // Lowercase before validating so a non-checksummed (but otherwise valid)
    // env-supplied address is accepted rather than crashing at import. Store
    // the checksummed form for display; key the map by the lowercased address.
    if (!address || typeof address !== 'string') return;
    const lower = address.toLowerCase();
    if (!ethers.isAddress(lower)) return;
    REGISTRY[lower] = { symbol, decimals, address: ethers.getAddress(lower) };
}

// USDC and EURC use 6 decimals; cbBTC uses 8.
register('USDC', 6, USDC_CONTRACT_ADDRESS);
register('EURC', 6, EURC_CONTRACT_ADDRESS);
register('cbBTC', 8, CBBTC_CONTRACT_ADDRESS);

/** Look up a token by its (signed) contract address. null if not allowlisted. */
export function getTokenByAddress(address: string): TokenInfo | null {
    if (!address || typeof address !== 'string') return null;
    return REGISTRY[address.toLowerCase()] ?? null;
}

/** Look up a token by symbol. Throws if that symbol isn't configured. */
export function getTokenBySymbol(symbol: TokenSymbol): TokenInfo {
    const info = Object.values(REGISTRY).find((t) => t.symbol === symbol);
    if (!info) throw new Error(`Token ${symbol} is not configured`);
    return info;
}

export function isAllowlistedToken(address: string): boolean {
    return getTokenByAddress(address) !== null;
}

/**
 * Format a signed base-unit amount for display using ONLY the registry's
 * decimals for the signed token address. Never uses sender-supplied
 * `humanAmount`/`tokenSymbol`. Throws if the token isn't allowlisted.
 */
export function formatSignedAmount(
    tokenAddress: string,
    baseUnits: bigint | string
): { amount: string; symbol: TokenSymbol } {
    const info = getTokenByAddress(tokenAddress);
    if (!info) {
        throw new Error('Voucher references an unrecognized token');
    }
    return {
        amount: ethers.formatUnits(baseUnits, info.decimals),
        symbol: info.symbol,
    };
}
