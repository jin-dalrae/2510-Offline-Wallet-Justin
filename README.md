# Offline Stablecoin Wallet

A mobile-first web application that enables offline stablecoin transactions using QR-based vouchers with settlement on Base Sepolia testnet.

## Features

- 🔐 **Secure Wallet Management**: Password-encrypted wallets stored locally
- 📱 **QR-Based Offline Transactions**: Send and receive USDC without internet
- 🎯 **Receiver-Specific Vouchers**: Vouchers can only be claimed by intended recipient
- 🔄 **Auto-Settlement**: Automatically settles pending transactions when online
- 💾 **Device-Specific Balances**: Offline balances tracked per device
- 🔥 **Firebase Sync**: Pending transactions synced across devices when online
- ⚡ **Base Sepolia**: Built on Coinbase's Base Sepolia testnet

## How It Works

### Offline Transaction Flow

1. **Sender**:
   - Opens "Send Offline"
   - Enters amount
   - Scans receiver's address QR code
   - Shows voucher QR code to receiver
   - Funds deducted from available balance

2. **Receiver**:
   - Opens "Receive Offline"
   - Shows address QR code to sender
   - Scans voucher QR code
   - Funds added to pending received balance

3. **Settlement** (when either device goes online):
   - App automatically detects online connection
   - Sweeps funds from temporary voucher wallets
   - Updates balances on-chain
   - Syncs status via Firebase

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Blockchain**: ethers.js v6, Base Sepolia USDC
- **QR Codes**: qrcode.react, html5-qrcode
- **Storage**: IndexedDB (local), Firebase Firestore (sync)
- **Styling**: Tailwind CSS with custom glassmorphism design

## Setup

### Prerequisites

- Node.js 18+ and npm
- Firebase project (optional, for transaction sync)
- Base Sepolia testnet ETH and USDC

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your Firebase configuration (optional for offline-only mode)

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

### Firebase Setup (Optional)

If you want transaction syncing:

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore Database
3. Enable Anonymous Authentication
4. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
5. Add your Firebase config to `.env`

### Getting Test Funds

1. **Base Sepolia ETH** (for gas):
   - Visit https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
   - Or use https://sepoliafaucet.com/

2. **Base Sepolia USDC**:
   - Contract: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
   - Use Circle's USDC faucet or bridge from Sepolia

## Usage

### Create Wallet

1. Click "Create New Wallet"
2. Choose a strong password (min 8 characters)
3. **Important**: Write down your 12-word recovery phrase
4. Store it safely - this is the only way to recover your wallet

### Send Money Offline

1. Click "Send Offline"
2. Enter amount in USDC
3. Scan receiver's address QR code
4. Show the generated voucher QR to receiver

### Receive Money Offline

1. Click "Receive Offline"
2. Show your address QR to sender
3. After sender creates voucher, scan it
4. Funds added to pending balance

### Settlement

- Happens automatically when you go online
- Receiver's device sweeps temporary wallet funds
- Both sender and receiver see updated balances
- Check transaction history for settlement status

## Security

- ✅ Private keys encrypted with password
- ✅ Vouchers are receiver-specific (validated by address)
- ✅ Cryptographic signatures prevent voucher tampering
- ✅ Offline balances tracked per device (prevents double-spending)
- ✅ 7-day voucher expiration
- ❌ Not audited - use for testing only

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   Device A      │         │   Device B      │
│   (Sender)      │         │   (Receiver)    │
│                 │         │                 │
│  1. Scan addr   │────────▶│  1. Show addr   │
│  2. Create      │         │  2. Scan        │
│     voucher     │◀────────│     voucher     │
│  3. Show QR     │         │  3. Validate    │
│                 │         │                 │
│  Offline: -10   │         │  Offline: +10   │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │  When online              │
         │                           │
         ▼                           ▼
┌─────────────────────────────────────────────┐
│          Base Sepolia Blockchain            │
│                                             │
│  Temp Wallet ──────▶ Receiver's Wallet     │
│    (settlement)                             │
└─────────────────────────────────────────────┘
```

## Project Structure

```
src/
├── lib/
│   ├── wallet.ts          # Wallet creation, encryption
│   ├── storage.ts         # IndexedDB for local data
│   ├── blockchain.ts      # Base Sepolia & USDC contract
│   ├── voucher.ts         # Voucher creation & validation
│   ├── firebase.ts        # Firestore integration
│   └── settlement.ts      # Auto-settlement logic
├── hooks/
│   ├── useWallet.ts       # Wallet state management
│   ├── useBalance.ts      # Balance calculations
│   ├── useOnlineStatus.ts # Network detection
│   └── useSettlement.ts   # Settlement orchestration
├── components/
│   ├── WalletSetup.tsx    # Create/import wallet
│   ├── Dashboard.tsx      # Main balance view
│   ├── SendOffline.tsx    # Offline send flow
│   ├── ReceiveOffline.tsx # Offline receive flow
│   ├── QRScanner.tsx      # Camera QR scanner
│   └── TransactionHistory.tsx
└── App.tsx                # Main app orchestration
```

## Troubleshooting

### Camera not working
- Grant camera permissions in browser
- Use HTTPS (required for camera access)
- Try a different browser

### Settlement failing
- Check if temporary wallet has ETH for gas
- Verify you're online
- Check Base Sepolia network status

### Firebase errors
- Verify Firebase config in `.env`
- Check Firestore rules are deployed
- Ensure anonymous auth is enabled

## License

MIT

## Disclaimer

⚠️ **This is experimental software for testing purposes only.**
- Not audited
- Use on testnet only
- Never send real money
- Always backup your recovery phrase
