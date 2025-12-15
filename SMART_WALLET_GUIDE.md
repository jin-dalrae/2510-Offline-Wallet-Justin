
# Smart Wallet & Testnet Guide

To solve the "Gas Fee" problem and test effectively, follow this guide.

## 1. Eliminate Gas Fees with Coinbase Smart Wallet
The current app uses "EOA" (External Owned Accounts) which require the user to hold ETH. To fix this, migrate to **Coinbase Smart Wallet**.

### Migration Steps
Since you are currently using `ethers.js`, the easiest path is to adopt the **Coinbase OnchainKit**.

1. **Install Dependencies**:
```bash
npm install @coinbase/onchainkit wagmi viem @tanstack/react-query
```

2. **Update Architecture**:
   - Replace `src/lib/blockchain.ts` with a Wagmi Config.
   - Using `useConnect()` from Wagmi will allow creating a Passkey-based wallet instantly.

3. **Enable Paymaster (Gas Sponsorship)**:
   - Go to [Coinbase Developer Platform](https://portal.cdp.coinbase.com/).
   - Create a project -> "Paymaster".
   - Copy the `PAYMASTER_URL`.
   - In your transaction code, verify gas sponsorship:
```typescript
import { sendUserOperation } from 'viem/account-abstraction';

// Sending a tx becomes sending a UserOp
client.sendUserOperation({
  account: smartWalletAccount,
  calls: [{ to: recipient, value: amount, data: '0x...' }],
  paymasterAndData: ... // Handled by simple Smart Wallet SDKs
});
```

## 2. Testing Effectively on Testnet

Until you complete the Smart Wallet migration, you must pay gas. We have added a **DEV TOOLS** button to your dashboard to help.

### Using the new Dev Tools
1. **Get Free Testnet ETH**:
   - Click the red **DEV** button in the bottom right.
   - Click **Get Testnet ETH**.
   - This opens the [Coinbase Faucet](https://portal.cdp.coinbase.com/products/faucet). Paste your address (copy it from the Dev Tools) to get free ETH.

2. **Reset State**:
   - Use "Factory Reset" to clear all local data and start fresh if your wallet gets stuck.

3. **Verify Transactions**:
   - Use [Base Sepolia Scan](https://sepolia.basescan.org/) to track your transactions using the address from Dev Tools.
