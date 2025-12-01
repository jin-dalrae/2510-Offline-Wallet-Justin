import { ethers } from 'ethers';

// Base Sepolia configuration
export const BASE_SEPOLIA_CONFIG = {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: import.meta.env.VITE_BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
};

// USDC Contract ABI (minimal interface for transfers)
const USDC_ABI = [
    'function balanceOf(address account) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
];

export const USDC_CONTRACT_ADDRESS =
    import.meta.env.VITE_USDC_CONTRACT_ADDRESS ||
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC

export class BlockchainService {
    private provider: ethers.JsonRpcProvider;
    private usdcContract: ethers.Contract;

    constructor() {
        this.provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_CONFIG.rpcUrl);
        this.usdcContract = new ethers.Contract(
            USDC_CONTRACT_ADDRESS,
            USDC_ABI,
            this.provider
        );
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
    getUSDCContract(signer?: ethers.Signer): ethers.Contract {
        if (signer) {
            return this.usdcContract.connect(signer) as any;
        }
        return this.usdcContract;
    }

    /**
     * Get ETH balance for gas fees
     */
    async getEthBalance(address: string): Promise<string> {
        const balance = await this.provider.getBalance(address);
        return ethers.formatEther(balance);
    }

    /**
     * Get USDC balance
     */
    async getUSDCBalance(address: string): Promise<string> {
        try {
            const balance = await this.usdcContract.balanceOf(address);
            const decimals = await this.usdcContract.decimals();
            return ethers.formatUnits(balance, decimals);
        } catch (error) {
            console.error('Error fetching USDC balance:', error);
            return '0';
        }
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
     * Get recent USDC transactions for an address
     */
    async getRecentTransactions(
        address: string,
        limit: number = 10
    ): Promise<any[]> {
        try {
            // Get transfer events where address is sender or receiver
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 10000); // Last ~10k blocks

            const sentFilter = this.usdcContract.filters.Transfer(address, null);
            const receivedFilter = this.usdcContract.filters.Transfer(null, address);

            const [sentEvents, receivedEvents] = await Promise.all([
                this.usdcContract.queryFilter(sentFilter, fromBlock, currentBlock),
                this.usdcContract.queryFilter(receivedFilter, fromBlock, currentBlock),
            ]);

            const allEvents = [...sentEvents, ...receivedEvents]
                .sort((a, b) => {
                    if (a.blockNumber !== b.blockNumber) {
                        return b.blockNumber - a.blockNumber;
                    }
                    return (b.transactionIndex || 0) - (a.transactionIndex || 0);
                })
                .slice(0, limit);

            const decimals = await this.usdcContract.decimals();

            return await Promise.all(
                allEvents.map(async (event) => {
                    const block = await this.provider.getBlock(event.blockNumber);
                    const isSent = (event as any).args?.[0].toLowerCase() === address.toLowerCase();

                    return {
                        hash: event.transactionHash,
                        from: (event as any).args?.[0],
                        to: (event as any).args?.[1],
                        amount: ethers.formatUnits((event as any).args?.[2] || 0, decimals),
                        timestamp: block?.timestamp || 0,
                        blockNumber: event.blockNumber,
                        type: isSent ? 'sent' : 'received',
                    };
                })
            );
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
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

            const gasEstimate = await this.usdcContract.transfer.estimateGas(to, amountInWei);
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
