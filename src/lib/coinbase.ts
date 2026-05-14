/**
 * Coinbase Developer Platform helpers.
 *
 *   - onrampUrl(): build a Coinbase Onramp URL for buying USDC with a card.
 *     Real funds settle on the destination network. Mainnet only — testnet
 *     buys are not supported by Onramp.
 *
 *   - cdpFaucetUrl(): deep-link to the CDP hosted faucet for free Base
 *     Sepolia USDC + ETH. This is what makes the testnet demo work.
 *
 * The Client API Key (VITE_CDP_CLIENT_API_KEY) is browser-safe by design —
 * CDP issues a separate server-side key pair (CDP_API_KEY_ID + private key)
 * for anything sensitive.
 */

export const CDP_ONRAMP_APP_ID =
    import.meta.env.VITE_CDP_ONRAMP_APP_ID ||
    import.meta.env.VITE_CDP_CLIENT_API_KEY ||
    '';

export interface OnrampParams {
    /** The user's wallet address. */
    destinationAddress: string;
    /** Asset symbol (default 'USDC'). */
    asset?: 'USDC' | 'EURC' | 'ETH';
    /** Network name as Coinbase expects it (default 'base'). */
    network?: 'base' | 'ethereum' | 'optimism' | 'polygon';
    /** Suggest an amount in USD (the user can change it). */
    presetFiatAmountUSD?: number;
    /** Pre-select a payment rail. */
    defaultPaymentMethod?: 'CARD' | 'APPLE_PAY' | 'ACH_BANK_ACCOUNT';
}

/**
 * Build the Coinbase Onramp hosted-page URL. Open this in the system browser
 * (window.open) or, in Capacitor, via the In-App Browser plugin so the user
 * can complete KYC if needed.
 *
 * Returns null if no Onramp app ID is configured.
 */
export function onrampUrl(params: OnrampParams): string | null {
    if (!CDP_ONRAMP_APP_ID) return null;

    const {
        destinationAddress,
        asset = 'USDC',
        network = 'base',
        presetFiatAmountUSD,
        defaultPaymentMethod = 'CARD',
    } = params;

    // `addresses` is a JSON-encoded {address: [network, ...]} object.
    const addresses = JSON.stringify({ [destinationAddress]: [network] });

    const url = new URL('https://pay.coinbase.com/buy/select-asset');
    url.searchParams.set('appId', CDP_ONRAMP_APP_ID);
    url.searchParams.set('addresses', addresses);
    url.searchParams.set('assets', JSON.stringify([asset]));
    url.searchParams.set('defaultNetwork', network);
    url.searchParams.set('defaultAsset', asset);
    url.searchParams.set('defaultPaymentMethod', defaultPaymentMethod);
    if (presetFiatAmountUSD) {
        url.searchParams.set('presetFiatAmount', String(presetFiatAmountUSD));
    }
    return url.toString();
}

/**
 * Coinbase Developer Platform's hosted faucet — gives free Base Sepolia USDC
 * and ETH. The user pastes their address; nothing programmatic.
 */
export function cdpFaucetUrl(): string {
    return 'https://portal.cdp.coinbase.com/products/faucet';
}

/**
 * Open a Coinbase URL in a way that works in both the browser and inside the
 * Capacitor WKWebView. In a future iteration we can swap this for the
 * @capacitor/browser plugin for a native in-app browser UX.
 */
export function openCoinbaseUrl(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
}
