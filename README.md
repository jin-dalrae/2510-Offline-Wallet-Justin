<p align="center">
  <img src="./justin_logo.svg" alt="Justin Logo" width="120"/>
</p>

<h1 align="center">Justin</h1>
<h3 align="center">The First Offline-Native AI Wallet for the Machine Economy</h3>

<p align="center">
  <strong>Stablecoins work everywhere. Even without the internet.</strong><br/>
  With autonomous AI agents that pay for you.
</p>

---

## The Problem

**Cash is dying—but digital payments fail when you need them most.**

The US is rapidly moving toward a cashless future. Stablecoins like USDC offer the promise of instant, low-cost digital payments. But there's a critical flaw: **crypto wallets don't work without internet**.

- 📵 **Network outages**: During emergencies, disasters, or just bad service, digital payments stop working
- 🏔️ **Coverage gaps**: Rural areas, subways, airplanes, basements—millions of daily transactions happen offline
- ⚡ **Real-time expectations**: Unlike card payments that can batch later, crypto wallets simply fail without connectivity

When USDC replaces the dollar in your pocket, **"no signal" can't mean "no money."**

Meanwhile, **AI agents** are emerging that need to pay for APIs, content, and services autonomously—but they lack wallets designed for machine-to-machine commerce.

---

## Our Solution

**Justin** is a USDC wallet on Coinbase's Base network that works **completely offline**—designed to replace cash in a fully digital economy.

### 1. Offline-First Architecture: Pending Amounts & Allowances

Justin doesn't just "queue" transactions—it implements a **true offline spending system** with cryptographic guarantees:

| Concept | Description |
|---------|-------------|
| **Offline Allowance** | Pre-authorized spending limit you can use without internet |
| **Pending Amount** | Transaction amounts held locally until settlement |
| **Settlement Limit** | Maximum unsettled balance before online sync required |
| **Auto-Settlement** | When *either* party goes online, pending amounts settle to the blockchain |

```
┌─────────────────────────────────────────────────────────────────┐
│  OFFLINE SPENDING SYSTEM                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────┐                                   │
│  │  YOUR WALLET             │                                   │
│  ├──────────────────────────┤                                   │
│  │  On-Chain Balance: $500  │  ◀── Actual USDC on Base         │
│  │  ─────────────────────── │                                   │
│  │  Offline Allowance: $100 │  ◀── How much you CAN spend      │
│  │  Pending Sent: -$35      │  ◀── Unconfirmed outgoing        │
│  │  Pending Received: +$20  │  ◀── Unconfirmed incoming        │
│  │  ─────────────────────── │                                   │
│  │  Available Offline: $65  │  ◀── Remaining spendable offline │
│  └──────────────────────────┘                                   │
│                                                                 │
│  When you go online:                                            │
│  • Pending Sent (-$35) settles → USDC transfers on-chain        │
│  • Pending Received (+$20) settles → USDC received on-chain     │
│  • Offline Allowance resets based on new balance                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### How Offline Transactions Work

1. **Sender creates a cryptographic voucher** (signed, encrypted, with temp wallet)
2. **Receiver scans QR code** and verifies the signature locally
3. **Both parties update their pending amounts** immediately
4. **First party to go online triggers settlement** for everyone in the chain

This means you can pay a friend, who pays a merchant, who pays a supplier—**all offline**—and it settles when any single person reconnects.

### 2. AI Agents for Web3 Payments (x402 Protocol)

Justin implements the **[x402 protocol](https://x402.org)**—the HTTP-native payment standard developed by Coinbase. Our AI agents handle:

- **Automatic Discovery**: Detects when a URL requires payment (via HTTP 402)
- **Smart Negotiation**: AI analyzes pricing and can counter-offer
- **Human-in-the-Loop Approval**: Users always approve before execution
- **Batch & Scheduled Payments**: Recurring subscriptions and multi-recipient payroll

```
User: "Pay for this API endpoint"
   │
   ▼
┌─────────────────────────────────────────┐
│  LANGGRAPH PAYMENT AGENT                │
├─────────────────────────────────────────┤
│  [1] check_url   → Parse 402 headers    │
│  [2] negotiate   → Analyze value/price  │
│  [3] interrupt   → Await user approval  │
│  [4] execute     → Sign & broadcast     │
│  [5] complete    → Verify on-chain      │
└─────────────────────────────────────────┘
```

---

## Why Now?

| Trend | Implication |
|-------|-------------|
| **Stablecoin adoption up 400% YoY** | Demand for real-world payment rails |
| **AI agent ecosystem emerging** | Agents need wallets that can pay autonomously |
| **Coinbase x402 protocol launched** | First standard for HTTP-native payments |
| **Account abstraction (ERC-4337)** | Gas-free, user-friendly transactions |

The convergence of **stablecoin mainstream adoption**, **AI agent proliferation**, and **standardized payment protocols** creates a once-in-a-decade window.

---

## Traction & Metrics

| Metric | Value |
|--------|-------|
| 🔧 **Build Status** | Production-ready MVP on Base Sepolia |
| 🌐 **Protocol** | Full x402 SDK integration |
| 🤖 **AI Backend** | LangGraph multi-agent orchestration |
| 📱 **Platform** | PWA (mobile-first, installable) |

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React + TypeScript | Mobile-first PWA |
| **Offline Storage** | IndexedDB (encrypted) | Zero-dependency local state |
| **Blockchain** | Base (Coinbase L2) | Low fees, high throughput |
| **AI Agents** | LangGraph + GPT-4 | Stateful, interruptible workflows |
| **Sync Layer** | Firebase Firestore | Optional cross-device sync |
| **Payment Protocol** | x402 (EIP-3009) | HTTP-native stablecoin payments |

---

## Business Model

| Revenue Stream | Description |
|----------------|-------------|
| **Settlement Fees** | 0.1% on offline voucher settlements |
| **Agent Transactions** | Per-use fee for AI payment execution |
| **Enterprise API** | White-label offline payment SDK |
| **Premium Features** | Multi-wallet, batch payments, analytics |

---

## Go-to-Market Strategy

### Phase 1: Emerging Market Partnerships (Months 1-6)
- Partner with **mobile money providers** in Africa & Southeast Asia
- Target **agricultural cooperatives** and **micro-merchants**
- Offline remittance corridors (US → Philippines, UAE → India)

### Phase 2: Developer Ecosystem (Months 6-12)
- Open-source the x402 integration toolkit
- Hackathon sponsorships (ETH Global, Base Buildathon)
- API for AI agent developers

### Phase 3: Enterprise Scale (Year 2+)
- B2B payroll solutions for distributed workforces
- Integration with major crypto payment processors
- Expansion to EURC and other regional stablecoins

---

## Competitive Landscape

| Feature | Justin | Traditional Wallets | Mobile Money |
|---------|--------|--------------------| -------------|
| Offline Transactions | ✅ Native | ❌ Requires internet | ⚠️ USSD only |
| AI Agent Payments | ✅ x402 Protocol | ❌ None | ❌ None |
| Stablecoin Native | ✅ USDC/EURC | ✅ Yes | ❌ Fiat locked |
| Auto-Settlement | ✅ Either party | ❌ N/A | ❌ N/A |
| Gas-Free UX | ✅ Smart Wallet ready | ⚠️ Varies | ✅ N/A |

---

## The Team

Building the bridge between **offline reality** and **on-chain finance**.

*[Team section to be populated]*

---

## The Ask

**Raising: $X Seed Round**

| Use of Funds | Allocation |
|--------------|------------|
| Engineering | 60% |
| Go-to-Market (Emerging Markets) | 25% |
| Legal & Compliance | 10% |
| Operations | 5% |

---

## Contact

📧 **[Email]**  
🔗 **[Website]**  
𝕏 **[@handle]**  

---

<p align="center">
  <strong>Justin</strong><br/>
  <em>Payments that work when the internet doesn't.</em>
</p>
