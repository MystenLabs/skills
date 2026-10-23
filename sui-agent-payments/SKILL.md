---
name: sui-agent-payments
description: Use when an agent needs to pay per call for APIs on Sui (USDC micro-payments via 402 / x402 / MPP flows), verify a settlement receipt, choose or self-host a Sui facilitator, or monetize an existing HTTP API behind a 402 paywall on Sui.
---

# Sui Agent Payments (per-call USDC APIs on Sui)

Pay-per-call agent payments on Sui follow the 402 pattern: the client requests a resource, receives HTTP `402 Payment Required` with machine-readable terms, signs an exact USDC payment, a facilitator settles it on Sui, and the resource returns `200` with an on-chain receipt digest. Sui's own rail ("Sui Agentic Payments") packages discovery, settlement, receipts, and on-chain spend allowances; independent x402-on-Sui facilitators let you run the same flow with your own gateway.

**Live state (verified 2026-10-23 — always re-check before building):** the main rail at <https://www.sui.io/agentpayments> is **testnet-only, paid calls invite-only**, with directory, docs, API listing, and llms.txt marked "coming soon". Independent facilitators are live today (see facilitators.md). This space moves weekly — check the live pages at the start of each session.

## Reference files

| File | Load when |
|---|---|
| [setup.md](setup.md) | Getting buyer or seller ready: identities, USDC on Sui, gas sponsorship, rail MCP tools |
| [core.md](core.md) | The 402 payment flow — request, terms, MPP and x402 dialects, on-chain spend grants |
| [facilitators.md](facilitators.md) | Choosing or self-hosting a facilitator; verify/settle/supported endpoints; gas sponsorship mechanics |
| [selling.md](selling.md) | Monetizing an existing HTTP API on Sui — front-door listing vs self-hosted 402, pricing |
| [receipts.md](receipts.md) | Verifying what was paid — digests, Suiscan, settlement recompute, replay-protection pitfalls |

## Sui-specific reminders

- **Buyers never need SUI.** Gas is sponsored by the facilitator or free (Sui settles stablecoin transfers natively at zero cost). The buyer's cost is the service price in USDC — nothing else.
- **Sellers pay nothing to receive.** The payer's transaction covers gas; a payTo address costs nothing to create and nothing to own.
- Every payment on Sui is its own object-level transaction with its own digest — receipts are per-call and independently verifiable.
- Read chain state via GraphQL or gRPC. The public Sui JSON-RPC endpoint has been retired; older code calling it fails with `-32601`.
- The x402 spec's network identifiers are `sui:mainnet` and `sui:testnet` (CAIP-2 style).

## The 30-second shape

1. **Buyer:** fetch resource → 402 terms → sign exact payment → facilitator settles → 200 + receipt digest.
2. **Seller:** keep serving plain HTTP. Either let a gateway front you (it adds the paywall), or answer 402 yourself and point your middleware at a facilitator.
3. **Refunds:** only offers explicitly marked refundable open a shared RefundVault with a decision window; ordinary immediate payments are final.