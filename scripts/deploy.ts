/**
 * Deploy OfflineEscrow to Base Sepolia.
 *
 *   1. Put DEPLOYER_PRIVATE_KEY in .env (a key with Base Sepolia ETH)
 *   2. Set BASE_SEPOLIA_RPC_URL in .env (or it defaults to public RPC)
 *   3. npm run deploy:escrow
 *
 * After success, copy the printed address into VITE_ESCROW_CONTRACT_ADDRESS
 * in .env so the frontend picks it up.
 */
import { network } from 'hardhat';
import fs from 'node:fs';
import path from 'node:path';

const { ethers } = await network.connect({ network: 'baseSepolia' });

async function main() {
    const [deployer] = await ethers.getSigners();
    const deployerAddr = await deployer.getAddress();
    const network_ = await ethers.provider.getNetwork();
    const balance = await ethers.provider.getBalance(deployerAddr);

    console.log(`\nDeploying OfflineEscrow`);
    console.log(`  Network:  chainId ${network_.chainId} (Base Sepolia = 84532)`);
    console.log(`  Deployer: ${deployerAddr}`);
    console.log(`  Balance:  ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
        console.error(`\n❌ Deployer wallet has 0 ETH on Base Sepolia.`);
        console.error(`   Fund it from a faucet:`);
        console.error(`   https://www.alchemy.com/faucets/base-sepolia`);
        console.error(`   https://docs.base.org/docs/tools/network-faucets/`);
        process.exit(1);
    }

    const Escrow = await ethers.getContractFactory('OfflineEscrow');
    console.log(`\nBroadcasting deployment tx...`);
    const escrow = await Escrow.deploy();
    const deployTx = escrow.deploymentTransaction();
    console.log(`  tx hash: ${deployTx?.hash}`);
    console.log(`  waiting for 2 confirmations...`);
    await escrow.waitForDeployment();

    const address = await escrow.getAddress();
    console.log(`\n✅ OfflineEscrow deployed`);
    console.log(`   Address:  ${address}`);
    console.log(`   Explorer: https://sepolia.basescan.org/address/${address}\n`);

    // Persist the address to a tracked file the frontend can read.
    const outPath = path.join(process.cwd(), 'src/lib/deployments.json');
    let existing: Record<string, unknown> = {};
    if (fs.existsSync(outPath)) {
        existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    }
    existing[`baseSepolia.OfflineEscrow`] = {
        address,
        chainId: Number(network_.chainId),
        deployedAt: new Date().toISOString(),
        deployer: deployerAddr,
    };
    fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
    console.log(`   Written: ${path.relative(process.cwd(), outPath)}\n`);

    console.log(`Next steps:`);
    console.log(`  1. Add to .env:  VITE_ESCROW_CONTRACT_ADDRESS=${address}`);
    console.log(`  2. (Optional) Verify on Basescan if BASESCAN_API_KEY is set.\n`);
}

main().catch((err) => {
    console.error('\n❌ Deployment failed:', err);
    process.exit(1);
});
