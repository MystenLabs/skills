# Buyer / seller setup

## What you need as a buyer

- **USDC on Sui.** Funded by an exchange withdrawal or a wallet flow that delivers USDC on Sui. You do not need SUI for gas in the flows below (sponsored or free stablecoin transfers).
- **Identity:** the owner keeps the wallet; the agent acts as a delegated signer with a scoped key. The rail supports platform-custodied delegate keys or bring-your-own — a leaked delegate key can only spend inside the grant's on-chain limits.
- **Rail MCP registration (when the rail directory is open to you):** register the rail's MCP server with your coding agent (Claude Code, Codex, and similar). Per the rail's own docs, the agent gets six tools: check access, discover, pay, fetch receipts, connect, disconnect.

## What you need as a seller

- Nothing new to run: your API stays exactly as it is. The decision is who issues the 402:
  - **Front-door listing** — a gateway fronts your endpoint and handles 402 + settlement.
  - **Self-hosted 402** — your middleware answers 402 and points at a facilitator (see facilitators.md).
- A payTo Sui address. Creating it is free; receiving USDC costs nothing because the payer's transaction pays gas.

## Choosing testnet vs mainnet

- Testnet USDC comes from Circle's testnet faucet (the Sui faucet dispenses SUI only); use it to harden the full loop before a mainnet cent moves.
- The main rail is testnet-only as of 2026-10-23. Independent facilitators (facilitators.md) already register `sui:mainnet`, so self-hosted seller flows can be mainnet-live while the rail itself is still invite-only.
- Pin network ids explicitly: `sui:testnet` for rehearsal, `sui:mainnet` for real money. Never mix them in one client config.
