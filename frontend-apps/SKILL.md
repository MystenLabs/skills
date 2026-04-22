---
name: frontend-apps
description: >
  Sui frontend / dApp development with @mysten/dapp-kit-react (React) and
  @mysten/dapp-kit-core (Vue, vanilla JS, Svelte, other frameworks). Use when
  building browser apps that connect Sui wallets, query on-chain state, or
  submit transactions. Covers wallet connection, network switching, transaction
  execution, query patterns with TanStack React Query, and the specific
  pitfalls of browser + wallet + async-indexer environments. Pair with the
  `sui-sdks` skill for @mysten/sui Transaction construction patterns and the
  `ptbs` skill for PTB semantics.
---

# Sui Frontend / dApp Kit

Browser Sui apps fail for a consistent set of reasons:

1. **Wrong package.** `@mysten/dapp-kit` (no suffix) is the legacy JSON-RPC-only package — **deprecated**. New code uses `@mysten/dapp-kit-react` or `@mysten/dapp-kit-core`.
2. **Wrong client.** dApp Kit takes a `SuiGrpcClient` (recommended) in `createDAppKit`'s `createClient`. Passing a `SuiJsonRpcClient` defeats the point of the new package.
3. **Old provider stack.** Code often tries the v1 pattern: `QueryClientProvider` → `SuiClientProvider` → `WalletProvider`. That's gone. New pattern: `createDAppKit` factory + `DAppKitProvider` (or a non-React equivalent).
4. **Dead hooks.** `useSuiClientQuery`, `useSuiClientInfiniteQuery`, `useSignAndExecuteTransaction` (mutation hook), `useConnectWallet`, `useDisconnectWallet`, `useSuiClient`, `useSuiClientContext` — **removed**. Replaced by `useCurrentClient` / `useCurrentNetwork` / `useDAppKit()` (imperative methods) + your own TanStack Query wrappers.
5. **Skipping `waitForTransaction` between execute and refetch.** Fullnodes index transactions asynchronously — invalidating TanStack caches immediately after `signAndExecuteTransaction` refetches stale data.
6. **Building PTBs in app code with `tx.build()` before handing to the wallet.** Defeats the wallet's gas selection. Always pass the `Transaction` instance (or `tx.serialize()`) to the wallet.

All patterns in this skill are derived from:
- https://sdk.mystenlabs.com/dapp-kit (landing)
- https://sdk.mystenlabs.com/dapp-kit/getting-started/react
- https://sdk.mystenlabs.com/dapp-kit/getting-started/next-js
- https://sdk.mystenlabs.com/dapp-kit/getting-started/vue
- https://docs.sui.io/standards/wallet-standard

If unsure about any API, fetch from the relevant page — do not extrapolate from the legacy `@mysten/dapp-kit` or the pre-v2 hook surface. Many outdated tutorials exist.

---

## Reference files

### setup — Install, factory, provider
**Path:** `setup.md`
**Load when:** starting a new dApp project, scaffolding React/Next.js/Vue setup, or migrating from the old three-provider pattern. Covers package choice, `createDAppKit({ networks, createClient })`, `DAppKitProvider` (React), and the `declare module` TypeScript augmentation.

### react — React hooks & patterns
**Path:** `react.md`
**Load when:** writing React components. Covers every current hook (`useCurrentAccount`, `useCurrentWallet`, `useCurrentNetwork`, `useCurrentClient`, `useDAppKit`, `useWallets`, `useWalletConnection`), standard components (`ConnectButton`), and wallet-gated UI idioms.

### non-react — Vue, vanilla JS, Web Components
**Path:** `non-react.md`
**Load when:** building Vue / Svelte / vanilla JS dApps. Covers `@mysten/dapp-kit-core`, nanostores reactive state (`dAppKit.stores.$connection` etc.), Web Components registration, Vue bindings via `@nanostores/vue`.

### queries — TanStack Query patterns
**Path:** `queries.md`
**Load when:** fetching on-chain data (balances, owned objects, coins, dynamic fields, transactions) in a dApp. Covers `useQuery` + `useCurrentClient`, `useInfiniteQuery` for paginated results, `enabled` guards, and cache invalidation after writes.

### transactions — Signing and executing
**Path:** `transactions.md`
**Load when:** submitting any transaction from a dApp. Covers `dAppKit.signAndExecuteTransaction`, the `$kind`-based result discriminant, `signTransaction` (wallet signs but doesn't execute — for sponsored flows), `signPersonalMessage`, the `waitForTransaction` + `invalidateQueries` sequence, and common wallet UX failures.

### limitations — What frontends can't or shouldn't do
**Path:** `limitations.md`
**Load when:** a user is designing something that feels like it crosses a browser-environment boundary. Covers: no backend-only features (gas station internals, validator keys), browser/SSR caveats, auto-connect reliability, JSON-RPC-specific features that don't have gRPC equivalents yet, and the "don't put secrets in the browser" rules.

## Routing guide

| Task | Load |
|------|------|
| New React dApp from scratch | setup + react + queries + transactions |
| New Vue / vanilla / Svelte dApp | setup + non-react |
| "How do I connect a wallet?" | react (or non-react) |
| "How do I query a balance / owned objects?" | queries |
| "How do I send a transaction?" | transactions + (sui-sdks for PTB construction) |
| Sponsored tx flow | transactions (front-end side) + ptbs (PTB side) |
| Migrating from `@mysten/dapp-kit` (no suffix) | setup + limitations + all as needed |
| Why is my UI stale after a tx? | transactions + queries |
| Dealing with SSR / Next.js | setup + limitations |
| Full code review of a dApp | **all reference files** |

## Skill Content

### Key concepts

- **Two packages, one API.** `@mysten/dapp-kit-react` wraps `@mysten/dapp-kit-core`. `createDAppKit` exists in both; actions (`signAndExecuteTransaction`, `signTransaction`, `switchNetwork`, `connectWallet`, `disconnectWallet`) are identical. What differs is how you read reactive state: React uses hooks; non-React reads nanostores stores.
- **One instance, many networks.** `createDAppKit({ networks: [...], createClient })` creates one dApp Kit instance that knows about multiple networks. `dAppKit.switchNetwork(name)` changes the active one. The `createClient` factory is called once per network, lazily.
- **gRPC by default.** The new dApp Kit is built for `SuiGrpcClient`. JSON-RPC is legacy; don't pass `SuiJsonRpcClient` to `createClient`.
- **Wallets are browser-only.** Wallet detection uses `window.navigator.wallets` and CustomEvents. Any component that touches wallet state must be client-side rendered. In Next.js / SSR frameworks this means `'use client'` on wallet-aware components.
- **The wallet owns gas.** Apps build the `Transaction` and pass it to the wallet. The wallet picks gas coins, sets budget (via dry-run), and signs. Never call `tx.build()` + pass bytes unless it's a sponsored flow — see `transactions.md`.
- **Fullnodes are eventually consistent.** `signAndExecuteTransaction` returns a digest before the data is queryable. Always `waitForTransaction` before refetching.

### Rules

1. **Use `@mysten/dapp-kit-react` or `@mysten/dapp-kit-core`** — never the bare `@mysten/dapp-kit` in new code. That package is JSON-RPC-only and deprecated.
2. **Use `SuiGrpcClient` in `createClient`.** Not `SuiJsonRpcClient`. Not `SuiClient` (v1 — removed).
3. **Use `createDAppKit` + `DAppKitProvider`.** Not the three-provider stack (`QueryClientProvider` + `SuiClientProvider` + `WalletProvider`). You still wrap with `QueryClientProvider` if you use TanStack Query for data fetching, but dApp Kit itself doesn't need it.
4. **Include the `declare module` TypeScript augmentation** so hooks get proper types without passing the instance manually.
5. **Do not use the removed hooks.** `useSuiClientQuery` / `useSuiClientInfiniteQuery` / `useSuiClientContext` / `useSuiClient` / `useSignAndExecuteTransaction` (mutation hook) / `useConnectWallet` / `useDisconnectWallet` — gone. Use `useCurrentClient` + `useQuery`/`useInfiniteQuery` + `useDAppKit()` imperative methods.
6. **Null-check the current account.** `useCurrentAccount()` returns `null` before connection. Always `if (!account) return` / gate with `enabled: !!account` in queries.
7. **`waitForTransaction` before cache invalidation.** `await client.waitForTransaction({ digest: result.Transaction.digest })` then `queryClient.invalidateQueries(...)`. Reversing this fetches stale data.
8. **Pass the `Transaction` instance (or `tx.serialize()`) to the wallet, not `await tx.build(...)` bytes.** The wallet needs to own gas selection. Exception: sponsored flows that use `tx.build({ client, onlyTransactionKind: true })` — see `ptbs` skill.
9. **Check `result.$kind === 'FailedTransaction'` (or `result.FailedTransaction`).** Don't assume success. Don't use v1's `result.effects?.status?.status`.
10. **Wallet-gated UI must client-render.** SSR without a client-side guard renders wallet buttons before wallets are detectable. Use `'use client'` / dynamic imports / effect-based hydration.

### Common mistakes

- **Using `@tanstack/react-query`'s `useQuery` without `enabled: !!account`** for queries that require a connected wallet. The query fires with undefined owner and errors.
- **Returning a `Transaction` from a React-Query `queryFn`.** Transactions aren't queries — use them in mutations or event handlers via `useDAppKit()`.
- **`dAppKit.signAndExecuteTransaction({ transactionBlock: tx })`.** It's `{ transaction: tx }` in the new API.
- **Reading `result.digest` directly.** On success the digest is at `result.Transaction.digest`. On failure there's no digest — check `result.FailedTransaction` first.
- **Invalidating queries before `waitForTransaction`.** Classic stale-UI bug. Always wait first.
- **Calling `new SuiGrpcClient(...)` inside components.** Breaks network switching. Use `useCurrentClient()`.
- **Instantiating `SuinsClient` / `DeepBookClient` directly.** Use `client.$extend(suins(), deepbook({ address }))` on the client returned from `createClient`.
- **Leaving `autoConnect: true` with a confusing UX.** Auto-reconnect restores the last wallet on load. If the app handles permissions/nonces, account for the async nature of that restore (pending / reconnecting states).
- **Hardcoding testnet / mainnet URLs in multiple places.** Keep them in a single `GRPC_URLS` map keyed by network name and reference from `createClient`.
- **Using wallet-standard APIs directly.** dApp Kit wraps the wallet standard — don't call `window.navigator.wallets` yourself; use `useWallets()` / `dAppKit.stores.$wallets`.
- **Storing private keys or secrets in the browser.** Never. dApps sign via wallets; backends hold keys.
