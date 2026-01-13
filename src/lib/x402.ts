/**
 * x402 Protocol Integration
 * 
 * This module implements the x402 payment standard using the official
 * @x402/fetch and @x402/evm packages from Coinbase.
 * 
 * x402 is an HTTP-native payment protocol that enables instant,
 * automatic stablecoin payments directly over HTTP.
 * 
 * @see https://x402.org
 * @see https://x402.gitbook.io/x402
 */

import { ethers } from 'ethers';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

// Import official x402 packages
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';

// Token addresses on Base Sepolia
export const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
export const EURC_CONTRACT_ADDRESS = '0x808456652fdb597867f38412077A9182bf77359F';
export const CBBTC_CONTRACT_ADDRESS = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';

// Base Sepolia chain ID in EIP-155 format
const BASE_SEPOLIA_CHAIN = 'eip155:84532';

export interface X402PaymentRequest {
    url: string;
    amount: string;
    token: string;
    receiver: string;
    network?: string;
    realm?: string;
}

export interface X402Config {
    rpcUrl?: string;
    chainId?: number;
}

/**
 * Create an x402-enabled fetch function for a wallet
 */
export function createX402Fetch(
    wallet: ethers.HDNodeWallet | ethers.Wallet,
    config: X402Config = {}
): typeof fetch {
    const rpcUrl = config.rpcUrl || 'https://sepolia.base.org';

    // Convert ethers wallet to viem account
    const privateKey = wallet.privateKey as `0x${string}`;
    const account = privateKeyToAccount(privateKey);

    // Create viem wallet client
    const walletClient = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(rpcUrl),
    });

    // Convert to x402 signer format (ensure address is present at top level)
    const evmSigner = toClientEvmSigner({
        ...walletClient,
        address: account.address
    } as any);

    // Create x402 client with EVM scheme registered for Base Sepolia
    const client = new x402Client()
        .register(BASE_SEPOLIA_CHAIN, new ExactEvmScheme(evmSigner));

    // Wrap fetch with x402 payment handling
    const x402Fetch = wrapFetchWithPayment(fetch, client);

    return x402Fetch;
}

/**
 * X402 Service - High-level API for x402 payments
 * 
 * This service provides both the official x402 SDK integration
 * and fallback methods for servers that use non-standard headers.
 */
export class X402Service {
    private wallet: ethers.HDNodeWallet | ethers.Wallet;
    private x402Fetch: typeof fetch;

    constructor(
        wallet: ethers.HDNodeWallet | ethers.Wallet,
        config: X402Config = {}
    ) {
        this.wallet = wallet;
        this.x402Fetch = createX402Fetch(wallet, config);
    }

    /**
     * Make a request that automatically handles x402 payments
     * 
     * This uses the official @x402/fetch wrapper which:
     * 1. Makes the initial request
     * 2. If 402 is returned, parses payment requirements
     * 3. Creates and signs payment using EIP-3009
     * 4. Retries request with payment header
     */
    async fetch(url: string, options?: RequestInit): Promise<Response> {
        return this.x402Fetch(url, options);
    }

    /**
     * Check if a URL requires payment without paying
     */
    async checkUrl(url: string): Promise<{
        requiresPayment: boolean;
        details?: X402PaymentRequest;
        content?: string;
    }> {
        try {
            // Make a GET request to check for 402
            const response = await fetch(url, { method: 'GET' });

            if (response.status === 402) {
                // Try to parse x402 payment requirements from response
                const details = await this.parsePaymentRequirements(response, url);
                return {
                    requiresPayment: true,
                    details
                };
            }

            if (response.ok) {
                const text = await response.text();
                return { requiresPayment: false, content: text };
            }

            throw new Error(`Request failed with status ${response.status}`);
        } catch (error) {
            console.error('X402 Check Error:', error);
            throw error;
        }
    }

    /**
     * Pay for and fetch content in one call
     * 
     * Uses the official x402 SDK to handle the full payment flow.
     */
    async payAndFetch(url: string): Promise<string> {
        const response = await this.x402Fetch(url);

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }

        return response.text();
    }

    /**
     * Parse payment requirements from a 402 response
     */
    private async parsePaymentRequirements(
        response: Response,
        url: string
    ): Promise<X402PaymentRequest> {
        let details: X402PaymentRequest = {
            url,
            amount: '',
            token: 'USDC',
            receiver: '',
        };

        // Clone response to read body multiple times if needed
        const clonedResponse = response.clone();

        // Try to parse x402 JSON body first (v2 standard)
        try {
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                const json = await response.json();

                // x402 v2 format with accepts array
                if (json.accepts && Array.isArray(json.accepts)) {
                    const accept = json.accepts[0]; // Take first option
                    if (accept) {
                        details.amount = accept.maxAmountRequired || accept.amount || '';
                        details.token = accept.asset?.symbol || 'USDC';
                        details.receiver = accept.payee || accept.to || accept.receiver || '';
                        details.network = accept.network || 'base-sepolia';
                    }
                }

                // Also check for direct properties
                if (json.amount) details.amount = json.amount;
                if (json.token) details.token = json.token;
                if (json.receiver || json.payee || json.to) {
                    details.receiver = json.receiver || json.payee || json.to;
                }
                if (json.description) details.realm = json.description;
            }
        } catch {
            // Not JSON, try headers
        }

        // Fallback: Parse headers (v1 style or custom implementations)
        const wwwAuth = clonedResponse.headers.get('WWW-Authenticate');
        const acceptPayment = clonedResponse.headers.get('Accept-Payment');
        const paymentAmount = clonedResponse.headers.get('Payment-Amount');

        if (wwwAuth?.toLowerCase().startsWith('x402')) {
            const params = this.parseAuthHeader(wwwAuth);
            if (params.amount && !details.amount) details.amount = params.amount;
            if (params.token && !details.token) details.token = params.token;
            if (params.receiver && !details.receiver) details.receiver = params.receiver;
            if (params.realm) details.realm = params.realm;
        }

        if (paymentAmount && !details.amount) {
            const parts = paymentAmount.split(/[\s,;]+/);
            parts.forEach(p => {
                const [key, val] = p.split('=');
                if (key === 'amount') details.amount = val;
                if (key === 'currency' || key === 'token') details.token = val;
            });
        }

        if (acceptPayment && !details.receiver) {
            const match = acceptPayment.match(/address=([^;,\s]+)/);
            if (match) details.receiver = match[1];
        }

        return details;
    }

    private parseAuthHeader(header: string): Record<string, string> {
        const result: Record<string, string> = {};
        const content = header.slice(5); // Remove 'x402 '
        const parts = content.split(',');

        parts.forEach(part => {
            const [key, ...valParts] = part.trim().split('=');
            if (key && valParts.length) {
                const val = valParts.join('=').replace(/"/g, '');
                result[key.trim()] = val;
            }
        });

        return result;
    }

    /**
     * Get the wallet address
     */
    getAddress(): string {
        return this.wallet.address;
    }
}

/**
 * Create an X402Service instance
 */
export function createX402Service(
    wallet: ethers.HDNodeWallet | ethers.Wallet,
    config?: X402Config
): X402Service {
    return new X402Service(wallet, config);
}

// Default export for convenience
export default X402Service;
