import { ethers } from 'ethers';
import { blockchain, USDC_CONTRACT_ADDRESS, EURC_CONTRACT_ADDRESS, CBBTC_CONTRACT_ADDRESS } from './blockchain';

export interface X402PaymentRequest {
    url: string;
    amount: string;
    token: string;
    receiver: string;
    realm?: string; // payment purpose
}

export class X402Service {
    /**
     * Check if a URL requires payment and extract details
     */
    static async checkUrl(url: string): Promise<{ requiresPayment: boolean; details?: X402PaymentRequest; content?: string }> {
        try {
            const response = await fetch(url);

            if (response.status === 402) {
                // Parse headers for payment details
                const wwwAuth = response.headers.get('WWW-Authenticate');
                const acceptPayment = response.headers.get('Accept-Payment');
                const paymentAmount = response.headers.get('Payment-Amount');

                // Logic to parse these headers
                // Example WWW-Authenticate: x402 realm="Premium Content", amount="1.00", token="USDC", receiver="0x..."
                // Example Accept-Payment: ethereum address=0x...
                // Example Payment-Amount: amount=1.00 currency=USDC

                // For this implementation, we'll try to support a few common formats loosely
                let amount = '';
                let token = 'USDC';
                let receiver = '';
                let realm = 'Access to resource';

                // Attempt to parse WWW-Authenticate (common standard style)
                if (wwwAuth && wwwAuth.toLowerCase().startsWith('x402')) {
                    const params = this.parseAuthHeader(wwwAuth);
                    if (params.amount) amount = params.amount;
                    if (params.token) token = params.token;
                    if (params.receiver) receiver = params.receiver;
                    if (params.realm) realm = params.realm;
                }

                // Fallback to specific headers
                if (paymentAmount) {
                    // format: amount=2.50 currency=USDC
                    const parts = paymentAmount.split(' ');
                    parts.forEach(p => {
                        const [key, val] = p.split('=');
                        if (key === 'amount') amount = val;
                        if (key === 'currency') token = val;
                    });
                }

                if (acceptPayment) {
                    // format: ethereum address=0x...
                    if (acceptPayment.includes('address=')) {
                        const match = acceptPayment.match(/address=([^;,\s]+)/);
                        if (match) receiver = match[1];
                    }
                }

                // Fallback: If no headers, check body (some APIs might do this)
                if (!amount || !receiver) {
                    try {
                        const json = await response.json();
                        if (json.amount) amount = json.amount;
                        if (json.token) token = json.token;
                        if (json.receiver) receiver = json.receiver;
                        if (json.address) receiver = json.address; // alias
                    } catch (e) {
                        // ignore
                    }
                }

                if (amount && receiver) {
                    return {
                        requiresPayment: true,
                        details: {
                            url,
                            amount,
                            token,
                            receiver,
                            realm
                        }
                    };
                }
            }

            // If 200 OK, return content
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
     * Pay and Fetch resource
     */
    static async payAndFetch(
        request: X402PaymentRequest,
        wallet: ethers.HDNodeWallet | ethers.Wallet
    ): Promise<string> {
        // 1. Resolve Token Address
        let tokenAddress = USDC_CONTRACT_ADDRESS;
        if (request.token === 'EURC') tokenAddress = EURC_CONTRACT_ADDRESS;
        if (request.token === 'cbBTC') tokenAddress = CBBTC_CONTRACT_ADDRESS;

        // 2. Execute Transaction
        const tx = await blockchain.transferERC20(
            wallet as unknown as ethers.Wallet,
            tokenAddress,
            request.receiver,
            request.amount
        );

        // Wait for 1 confirmation to ensure it's valid (optional for speed, but good for reliability)
        await tx.wait(1);

        // 3. Retry Request with Payment Proof
        // Standard is often X-Payment: <txHash> or specialized token
        const headers = {
            'X-Payment': tx.hash,
            'X-402-Payment-Proof': tx.hash, // Cover bases
            'Authorization': `x402 ${tx.hash}` // Another possible standard
        };

        const response = await fetch(request.url, { headers });

        if (!response.ok) {
            // If it fails again, maybe it needs more confirmations?
            if (response.status === 402) {
                throw new Error('Payment sent but server still requires payment (verification might take time)');
            }
            throw new Error(`Paid request failed: ${response.status}`);
        }

        return await response.text();
    }

    private static parseAuthHeader(header: string): Record<string, string> {
        const result: Record<string, string> = {};
        const parts = header.slice(5).split(','); // remove 'x402 '
        parts.forEach(part => {
            const [key, val] = part.trim().split('=');
            if (key && val) {
                // remove quotes
                result[key] = val.replace(/"/g, '');
            }
        });
        return result;
    }
}
