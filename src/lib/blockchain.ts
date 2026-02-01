import { ethers } from 'ethers';

// Base Sepolia configuration
export const BASE_SEPOLIA_CONFIG = {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: import.meta.env.VITE_BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
};

// ERC20 Contract ABI (minimal interface for transfers)
const ERC20_ABI = [
    'function balanceOf(address account) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
];

// Type for ERC20 contract with methods
interface ERC20Contract extends ethers.BaseContract {
    balanceOf(account: string): Promise<bigint>;
    transfer(to: string, amount: bigint): Promise<ethers.ContractTransactionResponse>;
    decimals(): Promise<bigint>;
    symbol(): Promise<string>;
}

export const USDC_CONTRACT_ADDRESS =
    import.meta.env.VITE_USDC_CONTRACT_ADDRESS ||
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC

export const CBBTC_CONTRACT_ADDRESS = '0xcbB7C0006F23900c38EB856149F799620fcb8A4a'; // Base Sepolia cbBTC
export const EURC_CONTRACT_ADDRESS = '0x808456652fdb597867f38412077A9182bf77359F'; // EURC on Base Sepolia

export class BlockchainService {
    private provider: ethers.JsonRpcProvider;
    private usdcContract: ERC20Contract;

    constructor() {
        this.provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_CONFIG.rpcUrl);
        this.usdcContract = new ethers.Contract(
            USDC_CONTRACT_ADDRESS,
            ERC20_ABI,
            this.provider
        ) as unknown as ERC20Contract;
    }

    /**
     * Get provider instance
     */
    getProvider(): ethers.JsonRpcProvider {
        return this.provider;
    }

    /**
     * Get USDC contract instance
     */
    getUSDCContract(signer?: ethers.Signer): ERC20Contract {
        if (signer) {
            return this.usdcContract.connect(signer) as unknown as ERC20Contract;
        }
        return this.usdcContract;
    }

    /**
     * Get generic ERC20 contract instance
     */
    getERC20Contract(address: string, signer?: ethers.Signer): ERC20Contract {
        const contract = new ethers.Contract(address, ERC20_ABI, this.provider) as unknown as ERC20Contract;
        if (signer) {
            return contract.connect(signer) as unknown as ERC20Contract;
        }
        return contract;
    }

    /**
     * Get ETH balance
     */
    async getEthBalance(address: string): Promise<string> {
        try {
            const balance = await this.provider.getBalance(address);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('Error fetching ETH balance:', error);
            return '0';
        }
    }

    /**
     * Get generic ERC20 balance
     */
    async getERC20Balance(tokenAddress: string, walletAddress: string): Promise<string> {
        try {
            const contract = this.getERC20Contract(tokenAddress);
            const balance = await contract.balanceOf(walletAddress);
            const decimals = await contract.decimals();
            return ethers.formatUnits(balance, decimals);
        } catch (error) {
            console.error(`Error fetching ERC20 balance for ${tokenAddress}:`, error);
            return '0';
        }
    }

    /**
     * Get USDC balance
     */
    async getUSDCBalance(address: string): Promise<string> {
        return this.getERC20Balance(USDC_CONTRACT_ADDRESS, address);
    }

    /**
     * Transfer USDC
     */
    async transferUSDC(
        wallet: ethers.Wallet,
        to: string,
        amount: string
    ): Promise<ethers.TransactionResponse> {
        const signer = wallet.connect(this.provider);
        const contract = this.getUSDCContract(signer);

        const decimals = await contract.decimals();
        const amountInWei = ethers.parseUnits(amount, decimals);

        const tx = await contract.transfer(to, amountInWei);
        return tx;
    }

    /**
     * Transfer any ERC20 token
     */
    async transferERC20(
        wallet: ethers.Wallet,
        tokenAddress: string,
        to: string,
        amount: string
    ): Promise<ethers.TransactionResponse> {
        const signer = wallet.connect(this.provider);
        const contract = this.getERC20Contract(tokenAddress, signer);

        const decimals = await contract.decimals();
        const amountInWei = ethers.parseUnits(amount, decimals);

        const tx = await contract.transfer(to, amountInWei);
        return tx;
    }

    /**
     * Transfer all USDC from one wallet to another (for settlement)
     */
    async sweepUSDC(
        fromWallet: ethers.Wallet,
        toAddress: string
    ): Promise<ethers.TransactionResponse | null> {
        const balance = await this.getUSDCBalance(fromWallet.address);
        const balanceNum = parseFloat(balance);

        if (balanceNum <= 0) {
            return null; // Nothing to sweep
        }

        return await this.transferUSDC(fromWallet, toAddress, balance);
    }

    /**
     * Get transaction receipt
     */
    async getTransactionReceipt(
        txHash: string
    ): Promise<ethers.TransactionReceipt | null> {
        return await this.provider.getTransactionReceipt(txHash);
    }

    /**
     * Wait for transaction confirmation
     */
    async waitForTransaction(
        txHash: string,
        confirmations: number = 1
    ): Promise<ethers.TransactionReceipt | null> {
        return await this.provider.waitForTransaction(txHash, confirmations);
    }

    /**
     * Get recent ERC20 transactions for an address and token
     */
    async getRecentERC20Transactions(
        tokenAddress: string,
        walletAddress: string,
        limit: number = 10
    ): Promise<any[]> {
        try {
            const contract = this.getERC20Contract(tokenAddress);
            const decimals = await contract.decimals();

            // Get transfer events where address is sender or receiver
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 10000); // Last ~10k blocks

            const sentFilter = contract.filters.Transfer(walletAddress, null);
            const receivedFilter = contract.filters.Transfer(null, walletAddress);

            const [sentEvents, receivedEvents] = await Promise.all([
                contract.queryFilter(sentFilter, fromBlock, currentBlock),
                contract.queryFilter(receivedFilter, fromBlock, currentBlock),
            ]);

            const allEvents = [...sentEvents, ...receivedEvents]
                .sort((a, b) => {
                    if (a.blockNumber !== b.blockNumber) {
                        return b.blockNumber - a.blockNumber;
                    }
                    return (b.transactionIndex || 0) - (a.transactionIndex || 0);
                })
                .slice(0, limit);

            return await Promise.all(
                allEvents.map(async (event) => {
                    const block = await this.provider.getBlock(event.blockNumber);
                    const isSent = (event as any).args?.[0].toLowerCase() === walletAddress.toLowerCase();

                    return {
                        hash: event.transactionHash,
                        from: (event as any).args?.[0],
                        to: (event as any).args?.[1],
                        amount: ethers.formatUnits((event as any).args?.[2] || 0, decimals),
                        timestamp: block?.timestamp || 0,
                        blockNumber: event.blockNumber,
                        type: isSent ? 'sent' : 'received',
                        tokenAddress: tokenAddress,
                    };
                })
            );
        } catch (error) {
            console.error(`Error fetching transactions for ${tokenAddress}:`, error);
            return [];
        }
    }

    /**
     * Get recent USDC transactions for an address
     * @deprecated Use getRecentERC20Transactions instead
     */
    async getRecentTransactions(
        address: string,
        limit: number = 10
    ): Promise<any[]> {
        return this.getRecentERC20Transactions(USDC_CONTRACT_ADDRESS, address, limit);
    }

    /**
     * Check if wallet has enough ETH for gas
     */
    async hasEnoughGas(address: string, estimatedGas: string = '0.001'): Promise<boolean> {
        const balance = await this.getEthBalance(address);
        return parseFloat(balance) >= parseFloat(estimatedGas);
    }

    /**
     * Estimate gas for USDC transfer
     */
    async estimateTransferGas(_from: string, to: string, amount: string): Promise<bigint> {
        try {
            const decimals = await this.usdcContract.decimals();
            const amountInWei = ethers.parseUnits(amount, decimals);

            // Estimate gas using the provider
            const gasEstimate = await this.provider.estimateGas({
                to: USDC_CONTRACT_ADDRESS,
                data: this.usdcContract.interface.encodeFunctionData('transfer', [to, amountInWei])
            });
            return gasEstimate;
        } catch (error) {
            console.error('Error estimating gas:', error);
            // Return a reasonable default
            return BigInt(100000);
        }
    }
}

// Singleton instance
export const blockchain = new BlockchainService();

