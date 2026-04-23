# Querying on-chain data in dApps

TanStack React Query + `useCurrentClient`. `useSuiClientQuery` / `useSuiClientInfiniteQuery` are **removed** — don't look for them.

## Basic query

```tsx
import { useCurrentClient, useCurrentAccount } from '@mysten/dapp-kit-react';
import { useQuery } from '@tanstack/react-query';

function Balance() {
  const client = useCurrentClient();
  const account = useCurrentAccount();

  const { data, isPending, error } = useQuery({
    queryKey: ['balance', account?.address, '0x2::sui::SUI'],
    queryFn: () =>
      client.core.listBalances({ owner: account!.address }),
    enabled: !!account,          // ← crucial — skip until connected
  });

  if (isPending) return <Spinner />;
  if (error) return <Error message={error.message} />;

  const sui = data.find((b) => b.coinType === '0x2::sui::SUI');
  return <p>{Number(sui?.totalBalance ?? 0n) / 1e9} SUI</p>;
}
```

**Always `enabled: !!account`** for queries that require an owner. Without it, the query fires with `undefined` and errors.

## Paginated queries

`client.core.list*` methods return a single nullable `cursor` field — iterate while it's non-null. The response shape also contains the results under a method-specific key: `objects` for `listOwnedObjects`, `coins` for `listCoins`, `dynamicFields` for `listDynamicFields`, etc. Use TanStack's `useInfiniteQuery`:

```tsx
import { useCurrentClient, useCurrentAccount } from '@mysten/dapp-kit-react';
import { useInfiniteQuery } from '@tanstack/react-query';

function OwnedNFTs() {
  const client = useCurrentClient();
  const account = useCurrentAccount();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['owned-nfts', account?.address],
    queryFn: ({ pageParam }) =>
      client.core.listOwnedObjects({
        owner: account!.address,
        cursor: pageParam,
        filter: { StructType: '0xPKG::nft::NFT' },   // type filter goes under `filter`
        include: { content: true },
        limit: 50,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
    enabled: !!account,
  });

  const all = data?.pages.flatMap((p) => p.objects) ?? [];
  return (
    <>
      {all.map((o) => <NFTCard key={o.objectId} object={o} />)}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
    </>
  );
}
```

## Core API methods (v2) — what you'll query

All hang off `client.core`:

| Method | Returns |
|---|---|
| `getObject({ objectId, include })` | `{ object }` |
| `getObjects({ objectIds, include })` | `{ objects }` |
| `listOwnedObjects({ owner, filter?, cursor?, limit?, include? })` | `{ objects, cursor }` |
| `listCoins({ owner, coinType?, cursor?, limit? })` | `{ coins, cursor }` |
| `listBalances({ owner })` | `{ balances }` |
| `listDynamicFields({ parentId, cursor?, limit? })` | `{ dynamicFields, cursor }` |
| `getDynamicField({ parentId, name })` | `{ dynamicField }` |
| `getCoinMetadata({ coinType })` | `{ coinMetadata }` |
| `getTransaction({ digest, include })` | `{ Transaction, FailedTransaction }` |
| `simulateTransaction({ transaction, include })` | simulation result |

**Include options** — keys differ by method:
- **Objects**: `content`, `previousTransaction`, `json`, `objectBcs`, `display`.
- **Transactions**: `effects`, `events`, `balanceChanges`, `transaction`, `bcs`.
- **Simulate**: adds `commandResults`.

## Cache invalidation after transactions

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useDAppKit, useCurrentClient, useCurrentAccount } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';

function MintButton() {
  const dAppKit = useDAppKit();
  const client = useCurrentClient();
  const account = useCurrentAccount();
  const queryClient = useQueryClient();

  async function handleMint() {
    const tx = new Transaction();
    // ... build PTB (see sui-sdks / ptbs) ...

    const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
    if (result.$kind === 'FailedTransaction') throw new Error('Mint failed');

    // ✅ Wait for indexing BEFORE invalidating
    await client.waitForTransaction({ digest: result.Transaction.digest });

    await queryClient.invalidateQueries({ queryKey: ['balance', account?.address] });
    await queryClient.invalidateQueries({ queryKey: ['owned-nfts', account?.address] });
  }

  return <button onClick={handleMint}>Mint</button>;
}
```

Do **not** invalidate before `waitForTransaction` — the refetch will see stale data.

## Query keys

Include every input that can change the result:
- owner address
- coin type / object type filter
- network (if the query reads across networks)
- cursor / page params

```ts
queryKey: ['owned-nfts', account?.address, network, typeFilter]
```

Too loose a key causes cross-account data leakage when switching wallets. Too tight causes unnecessary refetches.

## Stale-while-revalidate defaults

TanStack Query aggressively refetches on window focus / reconnect. For rapidly-changing on-chain data (balances, orderbook state) this is often right. For immutable data (a specific tx digest, a past object version) it's wasteful — tune `staleTime`:

```ts
useQuery({
  queryKey: ['tx', digest],
  queryFn: () => client.core.getTransaction({ digest, include: { effects: true } }),
  staleTime: Infinity,   // transactions don't change once finalized
});
```

## Derivations

Prefer to derive in the component, not in the query:

```tsx
const { data: balances } = useQuery({ queryKey: ['balances', addr], queryFn: ... });
const sui = balances?.find((b) => b.coinType === '0x2::sui::SUI');  // derive here
const suiAmount = Number(sui?.totalBalance ?? 0n) / 1e9;
```

Don't transform inside `queryFn` — TanStack's dedupe / cache works on the raw return, and double-transforming confuses invalidation.

## Don't use `queryFn` to run transactions

Queries should be pure reads. Transactions go in event handlers / mutations:

```tsx
// ❌ Don't do this
useQuery({ queryFn: () => dAppKit.signAndExecuteTransaction(...) });

// ✅ Do this — imperative in an event handler
async function onClick() {
  const result = await dAppKit.signAndExecuteTransaction(...);
}
```

If you want a mutation hook pattern, use TanStack's `useMutation` + `dAppKit.signAndExecuteTransaction` — dApp Kit no longer exports its own mutation hook.
