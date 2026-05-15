<p align="center">
  <img src="./justin_logo.svg" alt="Justin Logo" width="120"/>
</p>

<h1 align="center">Justin</h1>
<h3 align="center">A digital-dollar wallet that works without internet</h3>

<p align="center">
  <em>Pay someone next to you even if both of your phones have zero signal.</em>
</p>

---

## Read this part even if you know nothing about crypto

Imagine you have a **$20 bill** in your pocket. You can hand it to a friend in a
basement, on a plane, in the middle of the desert — anywhere. Cash doesn't need
Wi-Fi.

Now imagine you only have **money in an app** (Venmo, a bank app, a crypto
wallet). The moment there's no internet, that money is *frozen*. You can see the
number on the screen, but you can't give any of it to the person standing right
in front of you. Every digital payment app today needs the internet to move
money.

The world is going cashless. That's mostly good — but it means that "no signal"
is slowly starting to mean "no money." During a storm, a blackout, a crowded
concert, a subway ride, in a rural town — your money stops working exactly when
you might need it most.

**Justin fixes that.** Justin is an app that lets you send digital dollars
(a stablecoin called **USDC** — 1 USDC is always worth ~1 US dollar) to a person
near you **with no internet at all**, and it does it *safely*, so the person
receiving the money can trust they'll actually get it.

That's the whole point. The rest of this document explains exactly how, starting
simple and getting more technical as you scroll.

---

## Table of contents

1. [The one big problem](#the-one-big-problem)
2. [The key idea, explained with a gift card](#the-key-idea-explained-with-a-gift-card)
3. [A payment, step by step, with no internet](#a-payment-step-by-step-with-no-internet)
4. [Why the receiver can trust it (the "trustless" part)](#why-the-receiver-can-trust-it)
5. [Architecture overview](#architecture-overview)
6. [The smart contract: `OfflineEscrow`](#the-smart-contract-offlineescrow)
7. [The voucher protocol (v3)](#the-voucher-protocol-v3)
8. [Wallet options](#wallet-options)
9. [Technology stack](#technology-stack)
10. [Project structure](#project-structure)
11. [Running it yourself](#running-it-yourself)
12. [Testing](#testing)
13. [Security model & honest limitations](#security-model--honest-limitations)
14. [Roadmap: built vs. planned](#roadmap-built-vs-planned)

---

## The one big problem

A cryptocurrency payment is only "real" once it is written into the
**blockchain** — a giant shared notebook that lives on thousands of computers
around the world. To write into that notebook, you need the internet.

So a normal crypto wallet, with no internet, can do **nothing**. It can't send,
it can't confirm, it can't do anything but show you a stale number.

People have tried "just queue the payment and send it later when you're back
online." But that's not really a payment — it's an *IOU*. If I show you a
screen that says "I promise I sent you $20," you have no way to know:

- Do I actually *have* $20?
- Will I really go online and complete it, or will I just close the app?
- Did I show the same "$20 promise" to five other people?

A promise you can't verify is worthless to a stranger. To make offline payments
actually work, the receiver needs a way to be **sure**, while still offline,
that the money is really theirs. That's the hard part Justin solves.

---

## The key idea, explained with a gift card

Think about a **prepaid gift card**.

When you *buy* a $50 gift card, the store takes your $50 right then. The money
is now *locked* on the card. Later, you can hand that card to anyone, anywhere,
even with no internet — and they trust it, because the money was already paid
*up front*. The card is just proof. The value is already secured.

Justin works the same way, in three moves:

1. **Load the card (online, once).** While you have internet, you move some USDC
   into a special program on the blockchain called the **escrow contract**.
   Think of this like loading money onto a gift card. That money is now locked.
   *You* can pull it back any time, but nobody can spend it except through a
   voucher *you personally sign*.

2. **Write a signed note (offline).** With no internet, your phone creates a
   **voucher**: a little digital note that says *"Pay 5 USDC to this exact
   person,"* and your phone signs it with a secret key only you have. Signing
   doesn't need the internet — it's just math your phone does locally.

3. **Cash the note (online, later — by the receiver).** The person who received
   your voucher, the next time *they* get internet, hands the note to the escrow
   contract. The contract checks the signature, checks it hasn't been used
   before, and moves the locked money to them.

The receiver never had to trust *you*. They only had to trust the contract —
and the contract already had your money locked inside it before you ever wrote
the note.

---

## A payment, step by step, with no internet

Alice wants to pay Bob 5 USDC. Neither phone has signal.

```
BEFORE (each did this once, while online):
  Alice opened Justin, tapped "Add to offline budget", locked 100 USDC
  into the OfflineEscrow contract. Now the contract holds 100 USDC "for Alice".

NOW (both fully offline):

  1. Bob taps "Receive". His phone shows a QR code of his wallet address.

  2. Alice taps "Send", enters 5 USDC, scans Bob's QR.

  3. Alice's phone builds a voucher:
       { from: Alice, to: Bob, token: USDC, amount: 5,
         nonce: <random>, deadline: <24h from now> }
     and signs it with Alice's key. (No internet used — signing is local math.)

  4. Alice's phone shows the signed voucher as a QR code.

  5. Bob scans it. His phone checks the signature is really Alice's, checks
     the voucher is for *him*, checks it hasn't expired. All offline.
     Bob's app now shows "+5 USDC (pending)".

LATER (whoever gets internet first):

  6. Bob (or Alice, or anyone) submits the voucher to the escrow contract.
     The contract verifies everything again on-chain, subtracts 5 from
     Alice's locked budget, and sends 5 USDC to Bob's wallet. Done.
```

The transfer of *trust* happened in steps 3–5, completely offline. Step 6 is
just bookkeeping that catches up later.

---

## Why the receiver can trust it

This is the part that makes Justin different from a "queued IOU" app.

| Risk | How Justin removes it |
|------|----------------------|
| "Does the sender even have the money?" | The money was **locked in the escrow contract before the voucher was signed**. It's not in the sender's pocket anymore — it's already set aside. |
| "Will the sender bother to settle?" | The sender doesn't *need* to do anything later. **The receiver** redeems the voucher themselves. |
| "Can the sender spend the same money twice?" | Every voucher has a unique **nonce**. The contract marks each nonce used. A second voucher with the same nonce is rejected. Two different vouchers that together exceed the locked budget — only the ones that fit get paid; the rest revert. |
| "Can someone forge a voucher?" | The voucher is signed with the sender's private key. The contract verifies the signature cryptographically. No signature, no money. |
| "Can an old voucher be replayed forever?" | Every voucher has a **deadline** (24 hours by default). After that the contract refuses it. |
| "Can a voucher made for one app/chain be reused on another?" | The signature is bound, via **EIP-712**, to this exact contract address and this exact blockchain. It is meaningless anywhere else. |

The honest caveat: the receiver is trusting **the escrow smart contract**, not
the sender. That contract is small, open-source, has no admin backdoor, and
cannot be upgraded or paused by anyone (including us). But "trust the contract"
is still a real assumption — see [Security model](#security-model--honest-limitations).

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  JUSTIN APP  (React + TypeScript, runs on iOS via Capacitor)         │
│                                                                       │
│  ┌────────────┐   ┌──────────────┐   ┌───────────────────────────┐  │
│  │  Wallet    │   │  Voucher     │   │  Local ledger             │  │
│  │  (signer)  │   │  engine      │   │  (IndexedDB, on-device)   │  │
│  │            │   │  escrow.ts   │   │  storage.ts               │  │
│  │ EOA  ──────┼──▶│  sign / verify│  │  pending sends/receives   │  │
│  │ Smart ─────┤   │  EIP-712      │  │  offline budget cache     │  │
│  └────────────┘   └──────┬───────┘   └───────────────────────────┘  │
│                          │                                            │
│   QR transport (camera)  │  ← offline hop between two phones          │
└──────────────────────────┼────────────────────────────────────────────┘
                           │  online, eventually
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BASE NETWORK  (Ethereum Layer-2, chain id 84532 on Sepolia testnet) │
│                                                                       │
│   OfflineEscrow.sol  ── holds locked budgets, verifies vouchers,      │
│                          pays receivers, tracks used nonces           │
│   USDC / EURC / cbBTC  ── the actual ERC-20 stablecoins               │
└─────────────────────────────────────────────────────────────────────┘
            ▲                         ▲
            │                         │
   Coinbase CDP RPC          Coinbase Onramp / CDP Faucet
   (read/write the chain)    (get USDC in the first place)

  Optional: Google Firebase  ── cross-device sync of transaction history
            x402 AI agent     ── autonomous pay-per-use API payments (separate)
```

**Data flow in one sentence:** the app holds your keys and a local ledger,
builds and verifies signed vouchers entirely offline, and only touches the Base
network (via Coinbase's RPC) when someone is online to deposit, withdraw, or
redeem.

---

## The smart contract: `OfflineEscrow`

Source: [`contracts/OfflineEscrow.sol`](contracts/OfflineEscrow.sol).
Solidity `0.8.24`, built on OpenZeppelin, ~150 lines.

It is intentionally tiny. Four functions you'll use:

| Function | Who calls it | What it does |
|----------|--------------|--------------|
| `deposit(token, amount)` | Sender, online | Pulls `amount` of an ERC-20 from your wallet into your locked budget. (You `approve()` the token first.) |
| `withdraw(token, amount)` | Sender, online | Pulls unspent budget back to your wallet. Only you can withdraw your own funds. |
| `claim(from, to, token, amount, nonce, deadline, signature)` | Receiver (or anyone), online | Verifies the voucher and moves `amount` from `from`'s locked budget to `to`. |
| `quoteClaim(...)` | Anyone, read-only | Dry-run of `claim` — returns `(claimable, reason)` so a receiver can check a voucher *before* spending gas. |

Key state:

- `balanceOf[sender][token]` — each sender's locked budget, per token.
- `usedNonce[sender][nonce]` — replay protection, scoped per sender (two
  different people can independently pick the same random nonce; no conflict).

Security properties baked in:

- **No admin.** There is no owner, no upgrade key, no pause switch. The only
  ways funds leave are *your* `withdraw` or a valid `claim` of a voucher *you*
  signed. We (the developers) cannot move your money.
- **Reentrancy-guarded.** Uses OpenZeppelin `ReentrancyGuard` + `SafeERC20`.
- **EIP-712 domain binding.** Signatures are tied to `(name, version, chainId,
  contract address)`. A voucher cannot be replayed on another deployment or
  chain.
- **Wallet-agnostic verification.** Uses OpenZeppelin `SignatureChecker`, so it
  accepts both ordinary wallet signatures (ECDSA) **and** smart-contract wallet
  signatures (ERC-1271, e.g. Coinbase Smart Wallet / Safe) with no code change.

The contract is exercised by an end-to-end smoke test
([`scripts/verify-contract.ts`](scripts/verify-contract.ts)) covering the happy
path, replay, expiry, forged signatures, balance underflow, relayer submission,
and the ERC-1271 smart-wallet path — 16 assertions, all green.

---

## The voucher protocol (v3)

A voucher is a JSON object carried between phones as a QR code. The
cryptographically meaningful part is an **EIP-712 typed-data** message —
a standard, structured way of signing data that wallets can display readably.

The signed struct:

```
Voucher {
  address from;     // sender's wallet
  address to;       // receiver's wallet
  address token;    // which ERC-20 (USDC / EURC / cbBTC)
  uint256 amount;    // in base units (USDC has 6 decimals, cbBTC has 8)
  bytes32 nonce;     // random per voucher — replay protection
  uint256 deadline;  // unix seconds; default = signed time + 24h
}
```

The full transported object (`VoucherV3` in
[`src/lib/escrow.ts`](src/lib/escrow.ts)) also carries non-signed convenience
metadata — `tokenSymbol`, a human-readable `humanAmount`, and the `chainId` /
`escrowAddress` it's bound to — so the receiving app can validate and display
it without a network call.

Lifecycle:

1. **Sign** (`escrow.signVoucher`) — offline. Wallet signs the struct via
   `signTypedData`. No RPC.
2. **Encode** — `JSON.stringify` → QR (≈400 bytes, fits a level-H QR).
3. **Decode + verify** (`escrow.verifyVoucher`) — offline. Recovers the
   signer, checks `to == me`, checks `chainId`/`escrowAddress` match this
   deployment, checks `deadline`.
4. **Quote** (`escrow.quoteClaim`) — online, read-only. Asks the chain whether
   it would currently succeed (enough budget? nonce unused?).
5. **Claim** (`escrow.claim`) — online, a transaction. Moves the money.

> Versioning note: v1/v2 were an older "IOU" design (a temporary wallet key
> embedded in the QR). That model was **removed** — it required trusting the
> sender. v3 is a hard cut: the only voucher format is the escrow-redeemable
> one described here.

---

## Wallet options

Justin separates *who holds the key* from *what the app does with it*. One
internal `JustinSigner` type ([`src/lib/signer.ts`](src/lib/signer.ts)) covers
all of these so the rest of the codebase doesn't care which you picked:

| Option | Key custody | Offline signing | Notes |
|--------|-------------|-----------------|-------|
| **Coinbase Smart Wallet** (recommended) | Passkey in your device's Secure Enclave (Face ID / Touch ID) | ✅ Yes | No seed phrase. Smart-contract wallet (ERC-4337). Gas can be sponsored (Paymaster — planned). |
| **Email + password** | Encrypted private key in the device, password chosen by you | ✅ Yes | Classic. We never see the password or key. |
| **Google sign-in** | Encrypted key, unlocked via your Google account | ✅ Yes | Convenience; recoverable via Google. |
| **Import recovery phrase** | Your existing key from Coinbase Wallet / MetaMask / Rainbow / any BIP-39 phrase | ✅ Yes | Same address as your other wallet; Justin keeps its own encrypted copy. |

Security note on the email/password and import flows: the private key is
encrypted with your password and stored on-device only. It is cached in
`sessionStorage` **only for the lifetime of the browser tab** so you don't
retype it constantly; it is wiped when the tab closes. There is no hardcoded
fallback password (a real bug we found and fixed early in this project's
history).

x402 "Smart Pay" (autonomous API payments) is EOA-only by design — it needs a
raw private key for the EIP-3009 flow, which passkey wallets deliberately
cannot expose.

---

## Technology stack

| Layer | Choice | Why |
|-------|--------|-----|
| UI | React 18 + TypeScript + Vite 5 | Fast, typed, mobile-first SPA |
| Styling | Tailwind CSS 3 | Utility-first; the lime→cyan "Justin" look |
| Mobile | Capacitor 8 (iOS) | Wraps the web app as a real native iOS app; loads bundled assets from disk so it launches with no internet |
| Chain access | ethers v6 | Contract calls, signing, providers |
| Smart contract | Solidity 0.8.24 + OpenZeppelin 5 | `EIP712`, `SignatureChecker`, `ReentrancyGuard`, `SafeERC20` |
| Contract tooling | Hardhat 3 | Compile, test, deploy |
| Network | Base (Coinbase L2), Sepolia testnet (84532) | Cheap, fast, Coinbase ecosystem |
| RPC / funding | Coinbase Developer Platform (CDP) RPC, Onramp, Faucet | Rate-limit-free reads; buy/get USDC |
| Smart wallet | `@coinbase/wallet-sdk` v4 | Passkey / Face ID wallet |
| Offline storage | IndexedDB (via `idb`) | Encrypted key, voucher ledger, budget cache — all on-device |
| Optional sync | Google Firebase (Firestore + Auth) | Cross-device transaction history; app works fully without it |
| AI payments | Python + FastAPI + LangGraph (`backend/`) | Optional x402 pay-per-use agent |

Token addresses (Base Sepolia, overridable via `.env`):

- USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- EURC `0x808456652fdb597867f38412077A9182bf77359F`
- cbBTC `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf`

---

## Project structure

```
contracts/
  OfflineEscrow.sol     the escrow contract (the heart of the trust model)
  MockUSDC.sol           test ERC-20
  MockSmartWallet.sol    ERC-1271 wallet for testing the smart-wallet path
scripts/
  verify-contract.ts     end-to-end smoke test (16 assertions)
  deploy.ts              deploys to Base Sepolia, writes deployments.json
src/
  lib/
    escrow.ts            voucher sign/verify/claim + contract client
    signer.ts            JustinSigner union (EOA + smart wallet)
    smartWallet.ts       Coinbase Smart Wallet (passkey) wrapper
    blockchain.ts        provider + ERC-20 helpers; picks CDP RPC
    coinbase.ts          Onramp + Faucet URLs
    settlement.ts        catches pending vouchers up to chain when online
    storage.ts           IndexedDB ledger + offline budget
    voucher.ts           address-QR helpers (protocol lives in escrow.ts)
    firebase.ts          optional cloud sync
    wallet.ts            EOA key management
    x402.ts              x402 protocol client (EOA-only)
  hooks/
    useWallet.ts         dual-kind wallet state (eoa | smart)
    useBalance.ts useTransactions.ts useSettlement.ts useOnlineStatus.ts ...
  components/
    SignUp / SignIn      onboarding (Face ID, Google, email, import)
    SendOffline / ReceiveOffline   the QR voucher flow
    NewDashboard         balances, send/receive/load, history
    Terms / PrivacyPolicy / LegalDocument   legal docs
    admin/               admin dashboard (not shipped to end users)
backend/                 optional Python x402 AI agent
ios/                     generated Capacitor iOS project
```

---

## Running it yourself

### Prerequisites

- Node.js 20+ and npm
- A Base Sepolia wallet with a little test ETH (for deploying the contract)
- macOS + Xcode (only if you want to build the iOS app)

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in at least the Firebase keys (optional — app runs offline-only without
them) and your CDP client key (optional — falls back to public RPC). See the
comments in `.env.example`; the file is git-ignored.

### 3. Deploy the escrow contract (one time)

```bash
# put a funded Base Sepolia key in .env as DEPLOYER_PRIVATE_KEY
npm run contract:deploy
# copy the printed address into .env as VITE_ESCROW_CONTRACT_ADDRESS
```

No test ETH? Open the app's "Load" screen → "Open CDP Faucet", or visit
<https://portal.cdp.coinbase.com/products/faucet>.

### 4. Run on web

```bash
npm run dev          # http://localhost:5173
```

### 5. Run on iPhone

```bash
npm run ios          # builds, syncs, opens Xcode
# in Xcode: pick your signing team, plug in your iPhone, press Run
```

The Smart Wallet / Face ID flow needs a real passkey-capable device or browser;
it cannot be exercised from a headless environment.

---

## Testing

```bash
npm run contract:compile   # solc 0.8.24
npm run contract:test      # 16-assertion end-to-end smoke test
npx tsc --noEmit           # type check
npm run lint               # eslint (incl. react-hooks rules)
npm run build              # full production build
```

The contract smoke test (`scripts/verify-contract.ts`) is the primary
correctness harness: deposit/withdraw, happy-path claim, nonce replay,
expiry, forged signature, balance underflow, relayer submission, and the
ERC-1271 smart-wallet path.

---

## Security model & honest limitations

What is actually guaranteed:

- The escrow contract has **no admin** and **cannot be upgraded or paused**.
  Developers cannot touch your funds.
- Vouchers are unforgeable, single-use, time-boxed, and bound to this exact
  deployment and chain.
- Private keys for EOA wallets never leave the device and are never sent to a
  server.

What you are still trusting / what is **not** done yet:

- **Smart-contract risk.** The contract is small and tested but unaudited. A
  bug could lose funds locked in it. Don't lock more than you'd risk.
- **Testnet.** This runs on Base **Sepolia**. Tokens have no real value. The
  code is mainnet-shaped but not mainnet-hardened.
- **No formal audit / KYC.** Justin itself performs no identity verification.
  (If you buy USDC via Coinbase Onramp, Coinbase does its own KYC — separate.)
- **QR only, for now.** The offline hop is camera-to-screen QR. Bluetooth LE
  transport is designed but **not built yet**.
- **No multi-hop.** A voucher settles exactly one sender→receiver hop. The
  "pay a friend who pays a merchant, all offline" chain is **not implemented**.
- **Gas.** Until Paymaster sponsorship lands, the person submitting a
  `claim`/`deposit`/`withdraw` pays Base gas (tiny, but needs a little ETH).
- The Smart Wallet passkey round-trip has been built and type-checked but not
  yet runtime-verified by the maintainers on a physical device.

Before any real-money launch this needs: a professional contract audit, legal
review of the [Terms](src/components/Terms.tsx) and
[Privacy Policy](src/components/PrivacyPolicy.tsx) (templates today), and a
compliance review (a contract that custodies stablecoins can trigger
money-transmitter rules depending on jurisdiction).

---

## Roadmap: built vs. planned

**Built and in the codebase**

- ✅ Trustless offline payments via on-chain escrow + EIP-712 vouchers (v3)
- ✅ `OfflineEscrow` contract + 16-assertion smoke test
- ✅ ERC-1271 support (smart-contract wallets work)
- ✅ Coinbase Smart Wallet (Face ID) sign-up
- ✅ Email/password, Google, and recovery-phrase import flows
- ✅ Coinbase CDP RPC, Onramp, and Faucet wiring
- ✅ iOS app shell via Capacitor
- ✅ Serious Terms of Service + Privacy Policy with explicit consent
- ✅ Optional Firebase cross-device sync

**Planned / in progress**

- ⏳ Dashboard "offline budget" deposit/withdraw UI
- ⏳ Paymaster gas sponsorship (gas-free transactions)
- ⏳ Bluetooth LE transport (no camera needed)
- ⏳ Receiver-side spending caps + sender liveness proofs
- ⏳ Live WalletConnect for external wallets
- ⏳ Contract audit + mainnet hardening

---

## License & contact

See [PITCH.md](PITCH.md) for the product and business narrative.

Questions about the code: open an issue. Legal/privacy:
`legal@justin.example` (placeholder — replace before launch).

<p align="center"><em>Payments that work when the internet doesn't — and that the receiver can actually trust.</em></p>
