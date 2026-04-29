# Frontend Setup with dApp Kit

> **Source constraint:** All information sourced exclusively from [docs.sui.io](https://docs.sui.io) and [MystenLabs/sui-stack-hello-world](https://github.com/MystenLabs/sui-stack-hello-world).

## Prerequisites

- Node.js and `pnpm` package manager
- A published Move package on Testnet
- A browser wallet (Slush Wallet recommended)

## Use the existing hello-world UI

For the canonical full-stack workflow, do not run `npm create @mysten/dapp`. The hello-world repository already contains a Vite React app in `ui/`.

After publishing `move/hello-world`, update the package ID constant:

```ts
export const TESTNET_HELLO_WORLD_PACKAGE_ID = "<PACKAGE_ID>";
```

Then run the existing app:

```bash
cd sui-stack-hello-world/ui
pnpm install
pnpm dev
```

## Key packages

For the hello-world app, use the repository's existing `ui/package.json` as the source of truth. Do not add a second scaffold just to get these packages.

| Package | Purpose |
|---|---|
| `@mysten/dapp-kit` | React components and hooks for wallet connection, transaction signing, and object queries |
| `@mysten/sui` | Core TypeScript SDK for network interaction, transaction construction, and BCS encoding |
| `@tanstack/react-query` | Data fetching and caching (required peer dependency for dApp Kit) |

## Configuration and usage

1. Store your package ID in the existing `ui/src/constants.ts` file.
2. Set up network config using the SDK's `getFullnodeUrl` function.
3. Use `<ConnectButton />` from dApp Kit for wallet connection.
4. Use the `useSignAndExecuteTransaction` hook to construct PTBs and sign through the wallet.
5. Run `pnpm dev` to start the dev server at `http://localhost:5173/`.

Wallet addresses are separate from CLI-created addresses. Users might need to transfer tokens between their CLI address and wallet address.
