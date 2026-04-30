---
name: sui-frontend
description: >
  Sui frontend development with dApp Kit and the TypeScript SDK. Use when building
  a React frontend that connects to Sui, integrating wallet connection, constructing
  and signing transactions from the browser, querying onchain state, or working with
  @mysten/dapp-kit or @mysten/sui packages. Also use when the user asks about Slush
  Wallet integration, wallet addresses vs CLI addresses, or serializing transactions
  for frontend signing.
---

# Sui Frontend Development

> **Source constraint:** All information in this skill is sourced exclusively from [docs.sui.io](https://docs.sui.io). When extending or updating this skill, only pull from this source. Do not use third-party blogs, tutorials, or unofficial documentation.

Sui dApp Kit is a set of React components and hooks for building frontends that interact with the Sui network. This skill covers the frontend integration layer: wallet connection, transaction construction, and onchain state queries.

---

## Typical frontend stack

A Sui frontend app uses:

1. **React** as the UI framework
2. **Sui dApp Kit** (`@mysten/dapp-kit`) for wallet and transaction hooks
3. **Sui TypeScript SDK** (`@mysten/sui`) for network interaction and transaction construction
4. **A package manager** like `pnpm`

dApp Kit provides:

- **Wallet connection:** Components for connecting browser wallets (Slush Wallet, Coinbase Wallet, and others).
- **Transaction signing:** Hooks for constructing and signing transactions from the browser.
- **Object queries:** Hooks for reading onchain object state.

## Frontend workflow

1. The user connects their wallet through the dApp Kit wallet connection component.
2. The app constructs a transaction (a PTB) that calls Move functions on a published package.
3. The wallet prompts the user to approve and sign the transaction.
4. The signed transaction is submitted to the network.
5. The app reads the updated object state and displays results.

Wallet addresses are separate from CLI-created addresses. A user might need to transfer tokens between their CLI address and wallet address. To serialize a transaction for frontend signing, build the PTB on the backend and send the bytes to the frontend, where the wallet signs and executes it.

## Rules

- Always use `@mysten/dapp-kit` for wallet connection and transaction hooks in React apps.
- Always use `@mysten/sui` for transaction construction and network queries.
- Use `pnpm` as the package manager.
- Wallet addresses and CLI addresses are separate key pairs. Do not assume they are the same.

## Common mistakes

- **Confusing wallet addresses with CLI addresses.** They are separate key pairs managed by different tools. Users must explicitly transfer assets between them.
- **Building PTBs without the TypeScript SDK.** Always use `@mysten/sui` to construct transactions rather than hand-building JSON.
- **Not handling wallet disconnection.** Always account for the user disconnecting their wallet mid-session.
