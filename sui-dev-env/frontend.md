# Frontend Setup with dApp Kit

> **Source constraint:** All information sourced exclusively from [docs.sui.io](https://docs.sui.io).

## Prerequisites

- Node.js and `pnpm` package manager
- A published Move package on Testnet
- A browser wallet (Slush Wallet recommended)

## Scaffold a new app

```bash
npm create @mysten/dapp
```

Or manually set up with:

```bash
pnpm add @mysten/dapp-kit @mysten/sui @tanstack/react-query
```

## Key packages

| Package | Purpose |
|---|---|
| `@mysten/dapp-kit` | React components and hooks for wallet connection, transaction signing, and object queries |
| `@mysten/sui` | Core TypeScript SDK for network interaction, transaction construction, and BCS encoding |
| `@tanstack/react-query` | Data fetching and caching (required peer dependency for dApp Kit) |

## Configuration and usage

1. Store your package ID in a `constants.ts` file.
2. Set up network config using the SDK's `getFullnodeUrl` function.
3. Use `<ConnectButton />` from dApp Kit for wallet connection.
4. Use the `useSignAndExecuteTransaction` hook to construct PTBs and sign through the wallet.
5. Run `pnpm dev` to start the dev server at `http://localhost:5173/`.

Wallet addresses are separate from CLI-created addresses. Users might need to transfer tokens between their CLI address and wallet address.
