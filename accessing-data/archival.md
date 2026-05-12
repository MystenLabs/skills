# Archival Store

Source: https://docs.sui.io/concepts/data-access/archival-store

## What it is

From the docs:
> The Archival Store provides "long-term storage and access to historical network data that might no longer be available on full nodes because of pruning."
> Full nodes "enforce limited retention for scalability and performance," which is why this archival infrastructure exists — to preserve data after nodes discard it.

It retains:
- Old transactions.
- Old checkpoints.
- Old object versions (point-in-time state).

## Why pruning exists

Full nodes serve real-time queries. Retaining the entire history on every node would balloon storage and degrade query performance. Pruning lets full nodes stay fast by offloading older data to the archival backbone.

## Access model

**GraphQL RPC can route to archival when the operator configures it.** When a GraphQL deployment is paired with the Archival Service, supported historical lookups (point lookups of transactions, objects, checkpoints) route to archival transparently. For most apps using a properly configured GraphQL stack, the Archival Store is invisible. Note: this routing is operator-configured, not automatic — if the GraphQL operator has not set up archival, the service falls back to its Postgres database, which may have limited retention.

**Full nodes serving gRPC do not fall back to archival.** Full node gRPC endpoints do not automatically proxy or fall back to Archival Service endpoints. If you are using gRPC and need access to data beyond the full node's retention window, you must query the archival service directly at its own endpoint URL.

### Archival Service endpoint URLs

| Network | Archival gRPC URL |
|---|---|
| Mainnet | `archive.mainnet.sui.io:443` |
| Testnet | `archive.testnet.sui.io:443` |

The Archival Service exposes the same `LedgerService` gRPC API as a full node. Query it using any gRPC client by pointing at an Archival Service endpoint instead of a full node. These public endpoints have strict rate limits.

## When it matters

- **Compliance / audit** — proving on-chain activity from months or years ago.
- **Dispute resolution** — "what did this object look like at checkpoint X?".
- **Long-range analytics** — backfilling a custom indexer from deep history.
- **Historical explorers** — letting users browse old transactions beyond the live full node retention.

## Example: historical object version

GraphQL RPC is the easiest way to request a specific past version:

```graphql
query { object(address: "0x...", version: 42) { ... } }
```

If version 42 has been pruned from the full node, GraphQL RPC pulls it from the archival backbone. No client-side logic needed.

## For custom indexer backfills

When seeding a custom `sui-indexer-alt` pipeline from history, point the backfill source at the checkpoint GCS bucket (e.g., `gs://mysten-mainnet-checkpoints-use4`) rather than the archival service — the buckets are the canonical historical source for checkpoint ingestion. The Archival Store is the **query-side** counterpart to this; the backfill side of a custom indexer reads checkpoints directly.

## Common mistakes

- **Assuming full nodes have the whole history.** They don't. Past the pruning horizon, the archival path kicks in — if your code bypasses it, you see "not found."
- **Assuming gRPC full nodes fall back to archival.** They do not. Only GraphQL RPC routes to archival automatically. For gRPC clients, query the archival service directly at its own URL.
- **Confusing "Archival Store" with "checkpoint store."** Checkpoint store (GCS buckets) is the canonical checkpoint archive for backfill ingestion. Archival Store is the query-side service that serves pruned reads to gRPC/GraphQL clients. Related but distinct.
