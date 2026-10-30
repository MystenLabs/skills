---
name: deepbook-overview
description: >
  Explains DeepBook V3 on Sui: the central limit order book (CLOB) design, how a Pool
  is built from Book, State, and Vault, the DEEP token's role in fees, staking and
  governance, the three integration models, and mainnet package and pool IDs. Use when
  the user asks what DeepBook is or how it compares to an AMM like Uniswap, asks about
  DeepBook Pool internals, BigVector, or order matching, asks whether to integrate via
  Move package, TypeScript SDK, or read-only queries, asks about DEEP fees, staking,
  whitelisted pools, or voting, or needs a DeepBook mainnet package ID, pool object ID,
  coin type, or fee tier.
---

# DeepBook V3 Overview

## Quick start

| Question | Answer |
|----------|--------|
| What is it? | A central limit order book (CLOB) on Sui — **not an AMM**. Price-time priority matching, limit and market orders, discrete tick and lot sizes. No end-user interface. |
| What is a Pool made of? | **Book** (two BigVectors: bids, asks), **State** (Governance, History, Account), **Vault** (settlement + DeepPrice). |
| How do I integrate? | Move package, TypeScript SDK & PTBs, or read-only queries — see §3. |
| What is DEEP for? | Default fee token (or input token at +25%), taker-fee discounts via staking, and governance voting. |
| Mainnet v6 package | `0x337f4f4f6567fcd778d5454f27c16c70e2f274cc6377ea6249ddf491482ef497` |

Related skills: `deepbook-sdk` (TypeScript trading), `deepbook-move` (Move integration).
Reference files: `design.md` (matching/injection, governance mechanics, epoch history, full order-placement flow), `contract-info.md` (all 23 mainnet pools, every coin type and decimals, historical package versions, registry IDs).

---

## 1. Explaining DeepBook vs an AMM

State all five points:

- DeepBook V3 is a **central limit order book (CLOB)**, not an AMM — there is no bonding curve, no LP pool pricing, and no constant-product formula.
- Orders are matched by **price-time priority**: best price first, then earliest submission.
- It supports **limit orders** (rest on the book as maker) and **market orders** (take immediately), plus flash loans via a hot potato pattern within a single PTB.
- Prices move in **tick size** increments and quantities in **lot size** increments, set per pool. Orders not aligned to them are rejected. AMMs accept any continuous amount.
- DeepBook ships **no end-user interface**. It is infrastructure for trading apps, bots, and protocols.

## 2. Pool internals (Book / State / Vault)

A Pool is one market (e.g. SUI/USDC) as a Sui shared object with three components:

- **Book** — order storage and matching. Holds **two `BigVector` structures, one for bids and one for asks**. `BigVector` is implemented as a **B+ tree**, so insertion, cancellation, and in-price-order traversal stay efficient as the book grows.
- **State** — three submodules: **Governance** (fee/stake proposals and epoch voting), **History** (per-epoch volumes, fees collected, rebates), **Account** (per-user balances, stake, open orders, settled amounts).
- **Vault** — **asset settlement**: custodies pool balances, moves funds on fill and withdrawal, and maintains **DeepPrice** conversion rates so DEEP-denominated fees can be computed from the pool's own assets.

Full order placement flow, injection/matching details, and governance arithmetic: `design.md`.

## 3. Choosing an integration model

| Model | Use when | Dependency |
|-------|----------|------------|
| **Move package** | A protocol needs on-chain logic guarantees and composability with other Move packages | `deepbook = { mvr = "@deepbook/core" }` |
| **SDK & PTBs** | Apps, bots, and wallets submitting trades from TypeScript | `npm install @mysten/deepbook-v3` |
| **Read-only data** | Price and order book queries only, via indexer or RPC | None — query the endpoints directly |

Checklist for a new integration:

- [ ] Pick one model from the table above; default to **SDK & PTBs** unless on-chain composability is required.
- [ ] Create one **BalanceManager** per user and reuse it; grant `TradeCap`/`DepositCap`/`WithdrawCap` for delegated access.
- [ ] Fund the BalanceManager with the trading assets **and DEEP** (unless trading a whitelisted pool).
- [ ] Read the pool's tick size, lot size, and current taker/maker fees on-chain before sizing orders.
- [ ] Reference pools by SDK pool/coin keys, not hardcoded IDs, so the code works on mainnet and testnet.

## 4. The DEEP token

- **Default fee token.** Trading fees on non-whitelisted pools are paid in DEEP from the BalanceManager.
- **Alternative:** pay fees in the **input token at a 25% premium**.
- **Staking:** staking DEEP reduces taker fees — up to **halving** them once stake and volume thresholds are met. Maker fees are unaffected.
- **Governance:** stakers **propose and vote** on pool parameters each epoch — taker fee, maker fee, and stake requirement.
- **Whitelisted pools:** DEEP/SUI and DEEP/USDC have **0% taker and 0% maker fees**, providing gateway liquidity for DEEP.

## 5. Addresses and pools

Mainnet essentials:

- Current package (**v6**): `0x337f4f4f6567fcd778d5454f27c16c70e2f274cc6377ea6249ddf491482ef497`
- SUI/USDC pool: `0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407`, **1 bps taker fee, 0 bps maker fee**

Everything else — the other mainnet pools, coin types and decimals, historical package versions, registry IDs — is in `contract-info.md`. Load it before answering any address question not listed above; do not guess an ID.

Answer style for an address lookup — give the label, the full ID, and the fee tier, no truncation:

> **DeepBook V3 mainnet package (v6):** `0x337f4f4f6567fcd778d5454f27c16c70e2f274cc6377ea6249ddf491482ef497`
> **SUI/USDC pool:** `0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407` — 1 bps taker, 0 bps maker.

## Pitfalls

- **No DEEP in the BalanceManager → trades fail** on every non-whitelisted pool.
- **Hardcoded fees go stale.** Governance can change taker/maker fees and stake requirements each epoch; read them on-chain.
- **Misaligned orders are rejected.** Round price to tick size and quantity to lot size before submitting.
