<p align="center">
  <img src="./justin_logo.svg" alt="Justin Logo" width="100"/>
</p>

<h1 align="center">Justin — Product & Business Narrative</h1>

<p align="center"><em>The investor / product side of the story. For the
engineering documentation, see <a href="./README.md">README.md</a>.</em></p>

---

## The problem

The world is going cashless. Stablecoins (digital dollars like USDC) are the
fastest-growing rails for that shift — instant, low-cost, programmable. But
every stablecoin wallet shares one fatal limitation with every other digital
payment app: **it stops working without the internet.**

- Network outages, disasters, blackouts
- Coverage gaps: rural areas, transit, basements, planes, crowds
- Emerging markets where connectivity is intermittent by default

As physical cash disappears, "no signal" increasingly means "no money" — and it
fails people exactly when they're most vulnerable. Cash never had this problem.
Its digital replacement shouldn't either.

A second, related gap: **autonomous software agents** increasingly need to pay
for APIs and services, and they need wallets designed for machine-to-machine
commerce.

---

## The solution

**Justin is a self-custody USDC wallet on Coinbase's Base network that completes
person-to-person payments with zero internet — and does it trustlessly.**

The core innovation is not "queue a payment for later." Anyone can do that, and
it's just an unverifiable IOU. Justin's innovation is an **on-chain escrow
model**: the sender locks collateral on-chain *while online*, then signs offline
payment vouchers redeemable against that locked collateral. The receiver can
verify, fully offline, that the money is genuinely theirs — because it was set
aside before the voucher ever existed.

This means a receiver can accept an offline payment from a stranger with the
same confidence as accepting cash, without trusting the sender at all — only a
small, immutable, no-admin smart contract.

See [README.md](./README.md) for exactly how the cryptography and contract
work.

---

## Why now

| Trend | Implication for Justin |
|-------|------------------------|
| Stablecoin payment volume growing rapidly | Real demand for real-world stablecoin rails |
| Cashless transition accelerating in developed markets | The "offline gap" becomes a real consumer problem, not a niche |
| Coinbase Smart Wallet (passkeys) maturing | Onboarding without seed phrases — finally consumer-grade UX |
| Account abstraction (ERC-4337) + Paymasters | Gas-free, bank-app-like experience is now feasible |
| Autonomous AI agents emerging | A second market: machine-to-machine payments (x402) |

---

## Status

This is an **MVP on Base Sepolia testnet**, not a production financial product.
Honest current state:

- ✅ Trustless offline payment model implemented end-to-end (escrow contract +
  EIP-712 vouchers + verification), with a 16-assertion contract smoke test
- ✅ Coinbase Smart Wallet (Face ID) onboarding, plus email/Google/import
- ✅ Coinbase CDP integration (RPC, Onramp, Faucet)
- ✅ iOS app shell (Capacitor)
- ⏳ Bluetooth transport, Paymaster gas sponsorship, contract audit, mainnet
  hardening — planned, not done

We are deliberately not overstating maturity. The trust model is the moat; the
remaining work is productization.

---

## Business model

| Revenue stream | Description |
|----------------|-------------|
| Settlement fees | A small fee on voucher redemptions at scale |
| Agent transactions | Per-use fee for autonomous x402 agent payments |
| Enterprise / white-label | Offline-payment SDK for fintechs and wallets |
| Premium features | Multi-wallet, batch payroll, analytics |

---

## Go-to-market

**Phase 1 — Emerging-market & offline-first wedges.** Partner with mobile-money
providers and micro-merchant networks where intermittent connectivity is the
norm and the offline guarantee is not a nice-to-have but a requirement.

**Phase 2 — Developer ecosystem.** Open-source the offline-voucher + escrow
toolkit; hackathon presence; SDK for wallet builders.

**Phase 3 — Enterprise scale.** B2B payroll for distributed/low-connectivity
workforces; integrations with payment processors; additional regional
stablecoins (EURC and beyond).

---

## Competitive landscape

| Capability | Justin | Traditional crypto wallets | Mobile money |
|------------|--------|----------------------------|--------------|
| Offline P2P transfer | ✅ Trustless via on-chain escrow | ❌ Requires internet | ⚠️ USSD only, operator-custodied |
| Receiver can trust an offline payment | ✅ Yes (escrow guarantee) | ❌ N/A | ⚠️ Trusts the operator |
| Self-custody | ✅ Yes | ✅ Usually | ❌ Operator holds funds |
| Stablecoin-native | ✅ USDC/EURC/cbBTC | ✅ Varies | ❌ Fiat-locked |
| Seed-phrase-free onboarding | ✅ Passkey Smart Wallet | ⚠️ Varies | ✅ N/A |

The differentiator is the middle two rows: an offline payment a stranger can
*trust*, without giving up self-custody.

---

## The ask

*(Placeholder — populate with round size, use of funds, and team before
sharing externally.)*

| Use of funds | Allocation |
|--------------|------------|
| Engineering (audit, mainnet, Bluetooth, Paymaster) | 60% |
| Go-to-market (emerging-market partnerships) | 25% |
| Legal & compliance (money-transmitter analysis) | 10% |
| Operations | 5% |

---

## Contact

*(Placeholders — replace before any external use.)*

📧 `legal@justin.example` 🔗 `[website]` 𝕏 `[@handle]`

<p align="center"><strong>Justin</strong> — <em>payments that work when the
internet doesn't, and that the receiver can actually trust.</em></p>
