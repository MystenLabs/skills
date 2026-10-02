---
name: accessing-data
description: "Read data from the Sui network. Use when the request involves reading a balance, listing owned objects or NFTs, fetching an object, reading transaction history or effects, subscribing to events, querying on-chain state from a frontend or backend, choosing between gRPC and GraphQL RPC, migrating off JSON-RPC or SuiClient, building an indexer or analytics pipeline, looking up pruned or historical data, or storing images, video, audio or large files with Walrus. Covers SuiGrpcClient, SuiGraphQLClient, the Core API, the Archival Store, sui-indexer-alt and Walrus blob storage."
---

# Accessing data on Sui

Sui replaced its data APIs. A model trained before that will reach for `SuiClient`
and JSON-RPC, and that code will stop working: Sui Foundation mainnet full nodes
disable JSON-RPC the week of 27 July 2026 and decommission it by mid-October 2026.
This skill exists for that one reason. Everything else about reading data you can
work out.

## 1. Replace any v1 symbol you were about to write

| Do not write | Write instead |
|---|---|
| `import { SuiClient } from '@mysten/sui/client'` | `import { SuiGrpcClient } from '@mysten/sui/grpc'` |
| `new SuiClient({ url })` | `new SuiGrpcClient({ network, baseUrl })` |
| `client.getBalance(...)` | `client.core.listBalances({ owner })` |
| `client.getOwnedObjects(...)` | `client.core.listOwnedObjects({ owner, filter })` |
| `client.getObject(...)` | `client.core.getObject(...)` |
| `client.getTransactionBlock(...)` | `client.core.getTransaction(...)` |

`SuiJsonRpcClient` exists only as a migration surface. Do not use it in new code and
do not recommend it.

## 2. Pick the surface from the use case

There is no default surface. Match the job:

| What the user is building | Use |
|---|---|
| One balance, one object, one owner's NFTs | gRPC `client.core.*` |
| A dashboard or wallet view combining several of those | GraphQL RPC, one query instead of several round trips |
| Transaction history over a time range | GraphQL RPC |
| A marketplace listings page: filter and sort across types | GraphQL RPC |
| A live feed of new events | gRPC streaming |
| A leaderboard, explorer or custom analytics | custom indexer |
| Data older than full-node retention | Archival Store, via GraphQL RPC |
| Images, audio, video, models, large JSON | Walrus, never on-chain |

## 3. Write the client

gRPC, for single-entity reads:

```ts
import { SuiGrpcClient } from '@mysten/sui/grpc';

const client = new SuiGrpcClient({
  network: 'mainnet',
  baseUrl: 'https://fullnode.mainnet.sui.io:443',
});

const balances = await client.core.listBalances({ owner: '0x...' });

const nfts = await client.core.listOwnedObjects({
  owner: '0x...',
  filter: { StructType: '0x2::coin::Coin' },
});
```

Reuse one client. Creating a new `SuiGrpcClient` per request opens a new connection.

GraphQL, when one view needs several entities at once:

```ts
import { SuiGraphQLClient } from '@mysten/sui/graphql';

const client = new SuiGraphQLClient({ url: 'https://sui-mainnet.mystenlabs.com/graphql' });
```

`client.core.*` is the same facade on both clients, so the read calls above work
against either.

## 4. Load a reference file only if step 2 pointed you at one

| File | Load when |
|---|---|
| `references/use-cases.md` | the request does not match a row in step 2 |
| `references/grpc.md` | writing a backend, indexer, or streaming read path |
| `references/graphql.md` | writing composable queries, pagination, or dry runs |
| `references/indexers.md` | building an explorer, leaderboard, or analytics pipeline |
| `references/archival.md` | the data has been pruned from full nodes |
| `references/walrus.md` | storing or retrieving a file |

## 5. Check the answer before returning it

1. No `SuiClient`, no `getBalance`, no `getOwnedObjects`, no JSON-RPC endpoint.
2. The surface matches the use case in step 2, not a habit.
3. Blobs go to Walrus, not into a Move object.

Sources: https://docs.sui.io/concepts/data-access/data-serving,
https://docs.sui.io/concepts/data-access/graphql-rpc,
https://docs.sui.io/concepts/data-access/archival-store,
https://docs.sui.io/guides/operator/indexer-stack-setup, https://docs.wal.app
