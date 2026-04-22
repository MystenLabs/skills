# GraphQL RPC

Source: https://docs.sui.io/concepts/data-access/graphql-rpc

**Beta.** Official notice: *"Beta release of GraphQL RPC Server and General-purpose Indexer."* Expect occasional API churn.

Reads from three backing stores:
1. The **General-Purpose Indexer**'s Postgres (primary source — indexed, filterable).
2. A **full node** (live tip-of-chain reads the indexer hasn't caught up to).
3. The **Archival Store** (historical data pruned from full nodes).

GraphQL RPC routes each query to whichever backing store is right. Clients don't pick.

## When to use

From the docs:
> GraphQL RPC excels for applications requiring:
> - Historical data with configurable retention or filtered queries
> - Structured results for frontends (wallets, dashboards)
> - Flexible, composable queries that reduce data overfetching
> - Multiple data entities in single or consistent multi-request patterns

Typical fit:
- Frontend dashboards with several panels fetching related data.
- Wallet history views (tx list + effects + balance changes in one query).
- NFT marketplace explorers (filter + sort by type + traits).
- Point-in-time historical reads ("what did object X look like at checkpoint Y?").

## When not to use

- Real-time / streaming. → gRPC.
- Transaction submission. → gRPC (`transactionExecutionService`).
- Ultra-low-latency trading. → gRPC.
- App-specific analytics over millions of rows. → Custom indexer (`sui-indexer-alt`).

## Endpoint URLs

| Network | GraphQL URL |
|---|---|
| Mainnet | `https://graphql.mainnet.sui.io/graphql` |
| Testnet | `https://graphql.testnet.sui.io/graphql` |
| Devnet | `https://graphql.devnet.sui.io/graphql` |

Verify current URLs at the source page — beta endpoints occasionally move.

## TypeScript — `SuiGraphQLClient`

```ts
import { SuiGraphQLClient } from '@mysten/sui/graphql';
import { graphql } from '@mysten/sui/graphql/schema';

const client = new SuiGraphQLClient({
  network: 'mainnet',
  url: 'https://graphql.mainnet.sui.io/graphql',
});

const query = graphql(`
  query GetOwnedNFTs($owner: SuiAddress!, $type: String!) {
    address(address: $owner) {
      objects(filter: { type: $type }) {
        nodes {
          address
          version
          asMoveObject {
            contents {
              json
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`);

const result = await client.query({
  query,
  variables: { owner: '0x...', type: '0xpkg::nft::NFT' },
});
```

The `graphql()` helper provides type inference from the schema. Old code imports from `@mysten/sui/graphql/schemas/latest` — v2 is `@mysten/sui/graphql/schema` (singular).

## Rust — `sui-graphql` crate

```rust
use sui_graphql::client::Client;

let gql = Client::new("https://graphql.mainnet.sui.io/graphql")?;
// Queries are typed via sui-graphql-macros
```

## Query patterns

### Single entity

```graphql
query {
  object(address: "0x...") {
    version
    digest
    owner { ... on AddressOwner { owner } }
  }
}
```

### Owned objects with filter + pagination

```graphql
query Owned($owner: SuiAddress!, $cursor: String) {
  address(address: $owner) {
    objects(first: 50, after: $cursor, filter: { type: "0xpkg::nft::NFT" }) {
      nodes { address version }
      pageInfo { hasNextPage endCursor }
    }
  }
}
```

### Multi-entity single-request (the GraphQL advantage)

```graphql
query Profile($addr: SuiAddress!) {
  address(address: $addr) {
    balances(first: 20) { nodes { coinType { repr } totalBalance } }
    objects(first: 10, filter: { type: "0xpkg::nft::NFT" }) {
      nodes { address asMoveObject { contents { json } } }
    }
    transactionBlocks(last: 10) {
      nodes { digest effects { status } }
    }
  }
}
```

One round trip, three related entity types.

### Historical point-in-time

```graphql
query { object(address: "0x...", version: 42) { ... } }
```

For versions that full nodes have pruned, the server falls back to the Archival Store automatically.

## Pagination — cursor-based

Connection pattern (Relay-style):
- `nodes: [...]`
- `pageInfo: { hasNextPage, endCursor, hasPreviousPage, startCursor }`

```ts
let cursor: string | null = null;
do {
  const page = await client.query({
    query,
    variables: { cursor },
  });
  processPage(page.data.address.objects.nodes);
  cursor = page.data.address.objects.pageInfo.hasNextPage
    ? page.data.address.objects.pageInfo.endCursor
    : null;
} while (cursor);
```

## Beta caveats

- Schema may change. Pin your client to a specific `@mysten/sui` version and check release notes when upgrading.
- Some query shapes supported on gRPC are still being backported to GraphQL.
- Rate limits on public endpoints can be tight. Run your own General-Purpose Indexer for production-scale traffic.

## Relationship to the indexer

GraphQL RPC doesn't exist without the General-Purpose Indexer. If you need a query that GraphQL doesn't support out of the box, two options:

1. **Extend the General-Purpose Indexer** with an additional pipeline (see `indexers.md`), then query your new tables via GraphQL.
2. **Run a custom indexer** with its own schema and query it however you like (Postgres SQL, GraphQL, your own REST).

## Common mistakes

- **Using GraphQL RPC for tx submission.** It's read-only. Submit via gRPC (`transactionExecutionService`).
- **Using it for real-time.** GraphQL doesn't push. Use gRPC subscriptions.
- **Importing from `@mysten/sui/graphql/schemas/latest`** — v1. v2 is `@mysten/sui/graphql/schema`.
- **Treating pagination as offset-based.** GraphQL uses cursors. Don't pass integer offsets.
- **Over-fetching by selecting every field.** GraphQL's whole point is "ask for only what you need." Trim queries to the fields actually used.
- **Building production-critical flows on a beta endpoint without a fallback plan.** Have a migration path to gRPC or a custom indexer.
