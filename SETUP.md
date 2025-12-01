# Setup Guide

## Quick Start (Without Firebase)

The wallet works in offline-only mode without Firebase. You'll still be able to:
- Create/import wallets
- Send/receive offline transactions
- Auto-settle when online

However, transactions won't sync across devices.

### Steps:

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open in browser**: http://localhost:5173

3. **Get test funds**:
   - Visit https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
   - Get Base Sepolia ETH for gas fees

## Full Setup (With Firebase)

For cross-device transaction syncing:

### 1. Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Enter project name (e.g., "offline-wallet")
4. Disable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Firestore

1. In Firebase console, click "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode"
4. Select a location (closest to you)
5. Click "Enable"

### 3. Enable Anonymous Authentication

1. Click "Authentication" in sidebar
2. Click "Get started"
3. Click "Sign-in method" tab
4. Click "Anonymous"
5. Toggle "Enable"
6. Click "Save"

### 4. Get Firebase Config

1. Click the gear icon → "Project settings"
2. Scroll to "Your apps"
3. Click the web icon (`</>`)
4. Register app with nickname "Offline Wallet"
5. Copy the `firebaseConfig` object

### 5. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

### 6. Deploy Firestore Rules

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in the project:
   ```bash
   firebase init firestore
   ```
   - Select your project
   - Accept default file names

4. Replace `firestore.rules` content with the provided rules file

5. Deploy:
   ```bash
   firebase deploy --only firestore:rules
   ```

### 7. Start Development Server

```bash
npm run dev
```

## Testing Offline Transactions

### Option 1: Two Browser Tabs (Same Device)

1. **Tab 1 (Sender)**:
   - Open http://localhost:5173
   - Create wallet
   - Get test USDC

2. **Tab 2 (Receiver)**:
   - Open http://localhost:5173 in new tab
   - Create different wallet

3. **Send offline**:
   - Tab 1: Click "Send Offline"
   - Enter amount
   - Tab 2: Click "Receive Offline"
   - Tab 2: Show address QR
   - Tab 1: Scan QR (you can screenshot the QR and use an online QR scanner to get the data, then paste)
   - Tab 1: Show voucher QR
   - Tab 2: Scan voucher QR

4. **Verify balances**:
   - Tab 1: Should show negative offline sent
   - Tab 2: Should show positive offline received

### Option 2: Two Devices

1. **Device A (Desktop)**:
   - Run `npm run dev`
   - Find your local IP: `ifconfig | grep inet` (Mac/Linux) or `ipconfig` (Windows)
   - Open at http://YOUR_IP:5173

2. **Device B (Phone)**:
   - Connect to same WiFi
   - Open http://YOUR_IP:5173
   - Scan QR codes with camera

### Option 3: Test Settlement

1. Create offline transaction
2. Turn off WiFi (or use DevTools offline mode)
3. Verify balances show as pending
4. Turn WiFi back on
5. Watch auto-settlement happen
6. Check transaction history for settlement

## Getting Test USDC

### Method 1: Bridge from Sepolia

1. Get Sepolia ETH from https://sepoliafaucet.com/
2. Get Sepolia USDC from Circle faucet
3. Bridge to Base Sepolia using Superbridge

### Method 2: Use a Faucet

Check if there's a Base Sepolia USDC faucet available

### Method 3: Deploy Test Token

If you can't get USDC, you can deploy a simple ERC20 test token:

1. Use Remix IDE
2. Deploy a basic ERC20 with mint function
3. Update `.env` with your token address
4. Mint tokens to your wallet

## Production Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Firebase Hosting

```bash
firebase init hosting
# Select 'dist' as public directory
# Configure as single-page app: Yes
# Set up automatic builds with GitHub: Optional

firebase deploy --only hosting
```

### Deploy to Vercel/Netlify

1. Connect your GitHub repo
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables

## Troubleshooting

### "Camera not working"
- Ensure you're using HTTPS (or localhost)
- Grant camera permissions
- Try Chrome or Safari

### "Settlement failing"
- Check temporary wallet has ETH for gas
- Verify Base Sepolia RPC is working
- Try manually triggering settlement

### "Firebase errors"
- Verify all config values in `.env`
- Check Firestore rules are deployed
- Ensure anonymous auth is enabled

### "TypeScript errors"
- Delete `node_modules` and reinstall
- Restart dev server
- Check for missing type definitions

## Network Information

- **Network**: Base Sepolia Testnet
- **Chain ID**: 84532
- **RPC**: https://sepolia.base.org
- **Explorer**: https://sepolia.basescan.org
- **USDC Contract**: 0x036CbD53842c5426634e7929541eC2318f3dCF7e

## Support

For issues:
1. Check the console for errors
2. Verify network connection
3. Clear IndexedDB if needed (Application tab in DevTools)
4. Try in incognito mode
