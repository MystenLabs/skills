# Archival Store

Source: https://docs.sui.io/concepts/data-access/archival-store

**Beta.**

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

## Access model — **don't call it directly**

You don't point a client at the Archival Store. You call gRPC or GraphQL RPC as normal, and the server-side stack falls back to archival for data that's been pruned from the full node.

From the docs:
> The service is accessible via "gRPC-based" API calls, supporting both "GraphQL RPC" and direct "gRPC-based apps."

So: your gRPC client or GraphQL client transparently benefits from archival when asking for old data. For most apps the Archival Store is invisible.

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
- **Trying to call the Archival Store directly.** There's no public "archival API." Use gRPC or GraphQL.
- **Skipping Archival coverage checks in beta.** Archival Store is in beta; some ranges may not yet be fully populated. Verify before building critical paths that depend on deep history.
- **Confusing "Archival Store" with "checkpoint store."** Checkpoint store (GCS buckets) is the canonical checkpoint archive for backfill ingestion. Archival Store is the query-side service that serves pruned reads to gRPC/GraphQL clients. Related but distinct.
