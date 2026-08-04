# gRPC API

Source: https://docs.sui.io/concepts/data-access/data-serving · https://sdk.mystenlabs.com/sui/clients

The default data surface for new Sui code. Full nodes serve gRPC directly; no indexer in the path for most reads. Typed protobuf, streaming, code-gen for TS / Rust / Go / Python / any language with a gRPC toolchain.

From the docs: *"gRPC has built-in support for code generation, allowing you to scaffold clients in TypeScript, Go, Rust, and more, making it ideal for scalable backend systems like indexers, blockchain explorers, and data-intensive decentralized apps."*

## When to use

- Backend services, indexers, validators, market makers, exchanges.
- Live UI reads where low latency matters.
- Real-time subscriptions via streaming RPCs.
- Polyglot services (you need a client in a non-TS/Rust language — use gRPC code gen).
- Transaction submission and dry-run / simulate.

## When not to use

- Multi-entity joins across object types (e.g., "all NFTs owned by X minted after date Y with field Z > N"). Single-filter gRPC queries handle one dimension at a time. → Use GraphQL RPC for relational joins.
- App-specific analytics over millions of events. → Use a custom indexer.
- Historical data beyond full-node retention. → gRPC does not implicitly fall back to the Archival Store. For historical data beyond full-node retention, gRPC clients must query an Archival Service endpoint directly. GraphQL RPC can route to archival transparently when operator-configured. See `archival.md`.

## Endpoint URLs

| Network | gRPC URL |
|---|---|
| Mainnet | `https://fullnode.mainnet.sui.io:443` |
| Testnet | `https://fullnode.testnet.sui.io:443` |
| Devnet | `https://fullnode.devnet.sui.io:443` |

Run your own full node for production-critical traffic — public endpoints are rate-limited and shared.

## Service surface

The `SuiGrpcClient` exposes these typed services (protobuf-defined):

| Service | Purpose |
|---|---|
| `ledgerService` | Transaction / checkpoint / event reads and filtered List queries (`listTransactions`, `listEvents`, `listCheckpoints`) |
| `stateService` | Owned-objects listing, dynamic field listing, object state reads |
| `transactionExecutionService` | Submit transactions |
| `movePackageService` | Inspect published Move modules, functions, types |
| `nameService` | SuiNS lookups (reverse / forward) |
| `signatureVerificationService` | Verify a signature against a message |
| `subscriptionService` | Filtered real-time streams (`subscribeTransactions`, `subscribeEvents`, `subscribeCheckpoints`) |

The **Core API** (`client.core.*`) is a higher-level facade that works identically across `SuiGrpcClient` and `SuiGraphQLClient` for the common CRUD-ish reads. Its query methods (`listTransactions`, `listEvents`) hide filter construction and cursor pagination.

## TypeScript — `SuiGrpcClient`

```ts
import { SuiGrpcClient } from '@mysten/sui/grpc';

const client = new SuiGrpcClient({
  network: 'mainnet',
  baseUrl: 'https://fullnode.mainnet.sui.io:443',
});

// High-level Core API
await client.core.getObject({ objectId: '0x...', include: { content: true } });
await client.core.getObjects({ objectIds: [...], include: { content: true } });
await client.core.listOwnedObjects({
  owner: '0x...',
  filter: { StructType: '0xpkg::nft::NFT' },   // type filter goes under filter
  limit: 50,
});
await client.core.listCoins({ owner: '0x...', coinType: '0x2::sui::SUI', limit: 50 });
await client.core.listBalances({ owner: '0x...' });
await client.core.listDynamicFields({ parentId: '0x...', limit: 50 });   // parentId, not parent
await client.core.getDynamicField({ parentId: '0x...', name });
await client.core.getTransaction({ digest, include: { effects: true, events: true } });
await client.core.simulateTransaction({ transaction: tx });
await client.core.executeTransaction({ transaction: bytes, signatures: [...] });

// Filtered queries — transactions and events (cursor-paginated, transport-agnostic)
const page = await client.core.listTransactions({
  filter: { sender: '0x...' },           // or { function: '0xpkg::mod::fn' }
  order: 'descending',                    // 'ascending' (default) | 'descending'
  limit: 50,                              // default 50
  include: { effects: true },
});
// page: { transactions, hasNextPage, startCursor, endCursor }
if (page.hasNextPage) {
  const older = await client.core.listTransactions({
    filter: { sender: '0x...' },
    before: page.endCursor,               // page back
  });
  const newer = await client.core.listTransactions({
    filter: { sender: '0x...' },
    after: page.startCursor,              // poll for new items since this page
  });
}

const events = await client.core.listEvents({
  filter: { eventType: '0xpkg::mod::Minted' },   // or { sender }, { emitModule: '0xpkg::mod' }
  limit: 100,
});
// events: { events, hasNextPage, startCursor, endCursor }; each EventEntry has
// checkpoint, transactionDigest, eventIndex plus the usual event fields

// Low-level services (when you need protobuf directly)
await client.ledgerService.getTransaction({ digest: '0x...' });
await client.stateService.listOwnedObjects({ owner: '0x...', objectType: '0x2::coin::Coin<0x2::sui::SUI>' });
await client.stateService.listDynamicFields({ parent: '0x...' });
await client.movePackageService.getFunction({
  packageId: '0x2', moduleName: 'coin', name: 'transfer',
});
await client.nameService.reverseLookupName({ address: '0x...' });

// Raw ledger List RPCs (server-streaming, richer DNF filters than the core API):
// supports combined/negated predicates and checkpoint range bounds.
const stream = client.ledgerService.listTransactions({
  filter: {
    terms: [{ literals: [{ negated: true, predicate: { oneofKind: 'sender', sender: { address: '0x...' } } }] }],
  },
  readMask: { paths: ['digest', 'effects.status'] },
});
for await (const frame of stream.responses) {
  if (frame.transaction) console.log(frame.transaction.digest);
}
```

`include` flags replace v1's `options: { show*: true }`. Flags differ by method:

- **Object reads** (`getObject`, `getObjects`, `listOwnedObjects`): `content`, `previousTransaction`, `json`, `objectBcs`, `display`.
- **Transaction reads** (`getTransaction`, `waitForTransaction`, `listTransactions`): `effects`, `events`, `balanceChanges`, `objectTypes`, `transaction`, `bcs`.
- **Simulation** (`simulateTransaction`): adds `commandResults`.

Default fields on every object response: `objectId`, `version`, `digest`, `owner`, `type`.

## Rust — `sui-rpc` crate

```rust
use sui_rpc::client::Client;

let mut client = Client::new("https://fullnode.mainnet.sui.io:443")?;

let response = client
    .ledger_client()
    .get_object(object_id, read_mask)
    .await?;

let result = client
    .execution_client()
    .execute_transaction(transaction, vec![signature])
    .await?;
```

Service accessors on `sui_rpc::client::Client` use the `*_client()` suffix — `ledger_client()`, `execution_client()`, `package_client()`, `state_client()`, `subscription_client()`. There is no `ledger_service()` method. The filtered List queries are on `ledger_client()`: `list_transactions(...)`, `list_events(...)`, `list_checkpoints(...)` (GA in `sui-rpc` ≥ 0.3.2).

## Streaming / subscriptions

gRPC's big differentiator over HTTP: server-streaming RPCs for real-time feeds. The `subscriptionService` exposes `subscribeCheckpoints`, `subscribeTransactions`, and `subscribeEvents`, each taking the same filter message shape as the paired `ledgerService` List RPC of the same name.

Subscriptions begin at the current tip of the chain (latest executed checkpoint) and are **not resumable** — a new subscription always starts at the tip. To recover data missed between subscriptions, replay the gap with the paired List API: pass the last received `Watermark.cursor` as `after` on the List request.

```ts
// TypeScript — real-time filtered transaction stream
const stream = client.subscriptionService.subscribeTransactions({
  filter: {
    terms: [{ literals: [{ negated: false, predicate: { oneofKind: 'sender', sender: { address: '0x...' } } }] }],
  },
  readMask: { paths: ['digest', 'effects.status'] },
});
for await (const frame of stream.responses) {
  if (frame.transaction) {
    console.log(frame.transaction.digest); // matches the filter, in real time
  }
}
```

```ts
// Real-time event stream filtered by emitting module
const stream = client.subscriptionService.subscribeEvents({
  filter: {
    terms: [{ literals: [{ negated: false, predicate: { oneofKind: 'emitModule', emitModule: { module: '0xpkg::mod' } } }] }],
  },
  readMask: { paths: ['package_id', 'module', 'event_type', 'contents', 'json'] },
});
for await (const frame of stream.responses) {
  if (frame.event) processEvent(frame.event);
}
```

For a higher-level real-time pattern that avoids hand-building DNF filters, use the subscription RPCs from the `sui-publish` skill's production-monitoring section or the core query methods when polling a cursor suffices (see the `listTransactions` / `listEvents` examples above).

Rust uses `tokio::stream`. Both support cancellation via dropping the stream.

Use streaming for:
- Real-time event feeds.
- Checkpoint ingestion into a custom indexer.
- Order book updates / price feeds.
- Cross-chain bridge observation.

For backfill + live tail in one pipeline (the standard indexer pattern), combine a List RPC (historical scan) with a Subscribe RPC (live tip) — see `indexers.md`.

## Code gen for other languages

gRPC + protobuf means you can generate a client in any language with a gRPC runtime:

```bash
# Example: generate Go client
protoc --go_out=. --go-grpc_out=. sui.proto
```

Protobuf definitions live in the Sui monorepo under `crates/sui-rpc-api/proto/` (path may shift — grep for `.proto`).

## Transaction submission

```ts
await keypair.signAndExecuteTransaction({ transaction: tx, client });
// or, if signing separately:
await client.core.executeTransaction({
  transaction: bytes,
  signatures: [sig1, sig2],  // multi-sig or sponsored both fit this shape
  include: { effects: true },
});
```

## `waitForTransaction` — read-after-write consistency

```ts
const result = await keypair.signAndExecuteTransaction({ transaction, client });
await client.waitForTransaction({ digest: result.digest });
// subsequent reads on the same client will see the new state
```

Cross-node reads after a write are not guaranteed immediately visible. Either (a) do the read on the same node, or (b) `waitForTransaction` before switching nodes.

## Error handling

gRPC uses typed error codes (`INVALID_ARGUMENT`, `NOT_FOUND`, `RESOURCE_EXHAUSTED`, etc.) plus details:

```ts
try {
  await client.core.getObject({ objectId });
} catch (err) {
  // err has a grpc status code and message
}
```

`RESOURCE_EXHAUSTED` typically means rate limiting — back off or switch to your own full node.

## Performance tips

- **Batch via `getObjects` when you have many IDs** rather than looping `getObject`.
- **Paginate eagerly.** Core `list*` methods return a single nullable `cursor` — iterate while non-null, passing it back as the next request's `cursor`. Query methods (`listTransactions` / `listEvents`) return `hasNextPage` + `startCursor` / `endCursor`; continue with `after` (ascending) or `before` (descending).
- **Reuse the client.** Creating a new `SuiGrpcClient` per request opens a new connection.
- **Dry-run before signing for gas budget.** Saves failed txs.
- **Use subscriptions over polling** where possible.

## Common mistakes

- Using v1 method names: `client.getObject`, `client.getCoins`, `client.getOwnedObjects` — all from the deprecated v1/JSON-RPC surface. v2 is `client.core.getObject`, `client.core.listCoins`, `client.core.listOwnedObjects`.
- Using `options: { showEffects: true }` — v1. v2 is `include: { effects: true }`. Note that `include` option keys differ by method — see the table above.
- Passing `type: '0xpkg::m::T'` to `listOwnedObjects` — wrong. Type filters go under `filter: { StructType: '0xpkg::m::T' }`.
- Passing `parent:` to `listDynamicFields` — wrong. It's `parentId:`.
- Mixing pagination shapes: object/coin `list*` methods return a single `cursor` field (null when done), while query methods (`listTransactions` / `listEvents`) return `hasNextPage` + `startCursor` / `endCursor` and continue via `after` / `before`. Don't use `after`/`before` on the object lists, and don't look for a single `cursor` on the query methods.
- Using `getFullnodeUrl` helper — removed v1 API. For gRPC, pass the URL directly as `baseUrl`.
- Instantiating `SuiClient` — removed in v2. Use `SuiGrpcClient`.
- Checking `result.effects?.status?.status` — v1. v2 uses `$kind` discriminant.
- Polling for events/effects — use streaming.
