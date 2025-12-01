import { ethers } from 'ethers';

export interface WalletData {
    address: string;
    encryptedPrivateKey: string;
    mnemonic?: string; // Only stored during creation, should be backed up
}

export class WalletManager {
    private wallet: ethers.HDNodeWallet | ethers.Wallet | null = null;

    /**
     * Create a new random wallet
     */
    static createWallet(): { wallet: ethers.HDNodeWallet; mnemonic: string } {
        const wallet = ethers.Wallet.createRandom();
        return {
            wallet,
            mnemonic: wallet.mnemonic?.phrase || '',
        };
    }

    /**
     * Import wallet from mnemonic phrase
     */
    static fromMnemonic(mnemonic: string): ethers.HDNodeWallet {
        return ethers.Wallet.fromPhrase(mnemonic);
    }

    /**
     * Import wallet from private key
     */
    static fromPrivateKey(privateKey: string): ethers.Wallet {
        return new ethers.Wallet(privateKey);
    }

    /**
     * Encrypt private key with password
     */
    static async encryptPrivateKey(
        privateKey: string,
        password: string
    ): Promise<string> {
        const wallet = new ethers.Wallet(privateKey);
        return await wallet.encrypt(password);
    }

    /**
     * Decrypt private key with password
     */
    static async decryptPrivateKey(
        encryptedJson: string,
        password: string
    ): Promise<string> {
        const wallet = await ethers.Wallet.fromEncryptedJson(
            encryptedJson,
            password
        );
        return wallet.privateKey;
    }

    /**
     * Load wallet from encrypted data
     */
    async unlock(encryptedPrivateKey: string, password: string): Promise<void> {
        this.wallet = await ethers.Wallet.fromEncryptedJson(
            encryptedPrivateKey,
            password
        );
    }

    /**
     * Lock wallet (clear from memory)
     */
    lock(): void {
        this.wallet = null;
    }

    /**
     * Check if wallet is unlocked
     */
    isUnlocked(): boolean {
        return this.wallet !== null;
    }

    /**
     * Get current wallet instance
     */
    getWallet(): ethers.HDNodeWallet | ethers.Wallet {
        if (!this.wallet) {
            throw new Error('Wallet is locked');
        }
        return this.wallet;
    }

    /**
     * Get wallet address
     */
    getAddress(): string {
        if (!this.wallet) {
            throw new Error('Wallet is locked');
        }
        return this.wallet.address;
    }

    /**
     * Sign a message
     */
    async signMessage(message: string): Promise<string> {
        if (!this.wallet) {
            throw new Error('Wallet is locked');
        }
        return await this.wallet.signMessage(message);
    }

    /**
     * Sign a transaction
     */
    async signTransaction(transaction: ethers.TransactionRequest): Promise<string> {
        if (!this.wallet) {
            throw new Error('Wallet is locked');
        }
        return await this.wallet.signTransaction(transaction);
    }
}
