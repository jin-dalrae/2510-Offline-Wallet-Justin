import 'dotenv/config';
import { configVariable, defineConfig } from 'hardhat/config';
import hardhatEthersPlugin from '@nomicfoundation/hardhat-ethers';
import hardhatMochaPlugin from '@nomicfoundation/hardhat-mocha';
import hardhatEthersChaiMatchersPlugin from '@nomicfoundation/hardhat-ethers-chai-matchers';
import hardhatNetworkHelpersPlugin from '@nomicfoundation/hardhat-network-helpers';

export default defineConfig({
    plugins: [
        hardhatEthersPlugin,
        hardhatMochaPlugin,
        hardhatEthersChaiMatchersPlugin,
        hardhatNetworkHelpersPlugin,
    ],
    solidity: {
        profiles: {
            default: {
                version: '0.8.24',
                settings: {
                    optimizer: { enabled: true, runs: 200 },
                    viaIR: true,
                    evmVersion: 'cancun',
                },
            },
            production: {
                version: '0.8.24',
                settings: {
                    optimizer: { enabled: true, runs: 1_000_000 },
                    viaIR: true,
                    evmVersion: 'cancun',
                },
            },
        },
    },
    networks: {
        // Local in-process EDR network for tests.
        hardhatMainnet: {
            type: 'edr-simulated',
            chainType: 'l1',
        },
        // Base Sepolia (chain id 84532).
        baseSepolia: {
            type: 'http',
            chainType: 'l1',
            url: configVariable('BASE_SEPOLIA_RPC_URL'),
            accounts: [configVariable('DEPLOYER_PRIVATE_KEY')],
            chainId: 84532,
        },
    },
    paths: {
        sources: 'contracts',
        tests: 'test',
        cache: 'cache',
        artifacts: 'artifacts',
    },
});
