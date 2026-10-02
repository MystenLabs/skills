---
name: frontend-apps
description: "Build a Sui dApp in the browser. Use when connecting a Sui wallet, adding a connect button, reading on-chain state from a React, Next.js, Vue, Svelte or vanilla JS app, submitting or signing a transaction from the browser, switching networks, handling wallet rejection, refetching after a write, or migrating off @mysten/dapp-kit, SuiClientProvider, WalletProvider, useSuiClientQuery or useSignAndExecuteTransaction. Covers dapp-kit-react, dapp-kit-core, createDAppKit, TanStack Query patterns and waitForTransaction."
---

# Sui dApps in the browser

dApp Kit v2 replaced the package, the provider stack and most of the hooks. A model
trained before that writes v1 code that no longer runs. That is what this skill is
for.

## 1. Replace any v1 symbol you were about to write

| Do not write | Write instead |
|---|---|
| `@mysten/dapp-kit` | `@mysten/dapp-kit-react`, or `@mysten/dapp-kit-core` outside React |
| `SuiClientProvider` + `WalletProvider` + `QueryClientProvider` | `createDAppKit({ networks, createClient })` then `DAppKitProvider` |
| `new SuiJsonRpcClient(...)` in `createClient` | `new SuiGrpcClient({ network, baseUrl })` |
| `useSuiClient()`, `useSuiClientContext()` | `useCurrentClient()`, `useCurrentNetwork()` |
| `useSuiClientQuery(...)` | `useQuery()` from TanStack with `useCurrentClient()` |
| `useSuiClientInfiniteQuery(...)` | `useInfiniteQuery()` with `useCurrentClient()` |
| `useSignAndExecuteTransaction()` | `useDAppKit().signAndExecuteTransaction(...)` |
| `useConnectWallet()`, `useDisconnectWallet()` | `useDAppKit()` imperative methods, or `ConnectButton` |

Those hooks are removed, not deprecated. Code using them does not compile.

## 2. Set up the app

```tsx
import { createDAppKit, DAppKitProvider } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';

export const dAppKit = createDAppKit({
  networks: ['mainnet', 'testnet'],
  defaultNetwork: 'mainnet',
  createClient: (network) =>
    new SuiGrpcClient({ network, baseUrl: `https://fullnode.${network}.sui.io:443` }),
});

export function App() {
  return (
    <DAppKitProvider dAppKit={dAppKit}>
      <YourApp />
    </DAppKitProvider>
  );
}
```

## 3. Read on-chain state

There is no query hook any more. Combine `useCurrentClient` with TanStack Query, and
guard on the account existing:

```tsx
import { useQuery } from '@tanstack/react-query';
import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';

function Balance() {
  const account = useCurrentAccount();
  const client = useCurrentClient();

  const { data } = useQuery({
    queryKey: ['balances', account?.address],
    enabled: !!account,
    queryFn: () => client.core.listBalances({ owner: account!.address }),
  });

  return <span>{data?.balances?.[0]?.balance ?? '0'}</span>;
}
```

## 4. Write, then wait, then refetch

The fullnode indexes asynchronously. Refetching straight after execution returns
stale data, which is the most common bug in dApp code:

```tsx
const dAppKit = useDAppKit();
const client = useCurrentClient();
const queryClient = useQueryClient();

const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
await client.core.waitForTransaction({ digest: result.digest });
await queryClient.invalidateQueries({ queryKey: ['balances'] });
```

Pass the `Transaction` instance to the wallet. Do not call `tx.build()` first: that
takes gas selection away from the wallet.

## 5. Load a reference only if step 2 to 4 did not cover it

| File | Load when |
|---|---|
| `references/setup.md` | scaffolding a project, Next.js or Vue setup, TypeScript augmentation |
| `references/react.md` | any hook not shown above, `ConnectButton`, wallet-gated UI |
| `references/non-react.md` | Vue, Svelte, vanilla JS, Web Components, nanostores |
| `references/queries.md` | pagination, infinite queries, cache invalidation detail |
| `references/transactions.md` | sponsored flows, `signTransaction`, `signPersonalMessage`, result shapes |
| `references/limitations.md` | the request may cross a browser boundary, or involves secrets |

## 6. Check the answer before returning it

1. No `@mysten/dapp-kit` import, no `SuiClientProvider`, no `WalletProvider`.
2. No removed hook from the table in step 1.
3. A write is followed by `waitForTransaction` before any refetch.
4. The wallet receives a `Transaction`, not built bytes.

Sources: https://sdk.mystenlabs.com/dapp-kit,
https://sdk.mystenlabs.com/dapp-kit/getting-started/react,
https://sdk.mystenlabs.com/dapp-kit/getting-started/next-js,
https://sdk.mystenlabs.com/dapp-kit/getting-started/vue,
https://docs.sui.io/standards/wallet-standard
