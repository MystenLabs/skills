# Equivocation — preventing object lock

Equivocation is the **single biggest footgun** for any code that submits Sui transactions concurrently. It locks owned objects (including gas coins) until the next epoch — ~24h on mainnet/testnet, ~1h on devnet.

Source: https://docs.sui.io/concepts/sui-architecture/epochs · https://docs.sui.io/develop/sui-architecture/epochs · https://docs.sui.io/develop/transaction-payment/sponsor-txn

## What it is

Equivocation occurs when an owned object pair `(ObjectID, SequenceNumber)` is used concurrently in multiple non-finalized transactions. The canonical definition:

> Equivocation occurs when an owned object pair (`ObjectId`, `SequenceNumber`) is used concurrently in multiple non-finalized transactions.

> Client equivocation occurs when multiple valid transactions that share at least one owned object (such as a gas coin) at the same version are submitted to the network simultaneously.

## Why it locks the object

Validators accept **at most one transaction per (object, version)**. When a validator first sees a tx referencing `(obj, v)`, it locks that object at that version to the tx digest and refuses to sign any other tx at the same version.

If two competing txs are broadcast simultaneously, validators may receive them in different orders. Validator A locks to tx1; validator B locks to tx2. Neither tx collects 2/3 validator signatures ⇒ neither finalizes. The object stays locked until the end of the epoch.

Epoch lengths:
- Mainnet / Testnet: ~24 hours
- Devnet: ~1 hour

Result: **neither tx proceeds, and the object cannot be used in any other transaction** for the rest of the epoch.

## How it happens in practice

All real-world causes are variations on "the same owned object was signed into two txs before the first finalized":

1. **Backend service reusing a single gas coin across concurrent requests.** Each incoming request builds and submits a tx; if two requests hit in parallel, the second sees the same gas coin version.
2. **Stale full node.** A client queries the full node for the gas coin's version, but the node hasn't indexed a recent tx that bumped the version. Two builds see the same stale version.
3. **Sponsored-transaction flows without object isolation.** A malicious user submits a competing tx using an owned object from the gas station's signed tx — locking the gas station's coin. Symmetrically, a malicious gas station can lock a user's object.
4. **Wallet plus external signing.** A wallet signs two transactions that both reference the same coin before either finalizes.
5. **Retries without version refresh.** Client times out, retries, but constructs the retry against the same (now-maybe-committed) object version.

## Punishment

The network has safeguards to punish validators who equivocate — but the *client* side is where most equivocation bugs originate. There's no protocol-level protection for bad client behavior beyond the object lock.

## Prevention

### 1. Batch into a single PTB

Up to 1,024 operations fit in one PTB. One PTB = one signature over one set of object versions = zero equivocation risk. Prefer this whenever the ops come from the same sender.

Bad: 512 separate `transfer` transactions for an airdrop.
Good: one PTB with 512 `splitCoins`/`transferObjects` pairs against `tx.gas`.

### 2. `SerialTransactionExecutor` (TS SDK)

For wallets / services that own the signing key and are the **only** writer of the address's coins:

```ts
import { SerialTransactionExecutor } from '@mysten/sui/transactions';

const executor = new SerialTransactionExecutor({
  client,
  signer: keypair,
  defaultBudget: 50_000_000n,   // optional
});

// Even concurrent calls are serialized internally:
await Promise.all([
  executor.executeTransaction(tx1),
  executor.executeTransaction(tx2),
  executor.executeTransaction(tx3),
]);
```

- On first use, selects all SUI coins at the address, merges into one gas coin, and reuses that coin serially.
- Internal queue with cached object versions — clients don't need to read RPC between txs.
- **Assumption:** no other process signs for this address. If another wallet or service is active, this collides.

### 3. `ParallelTransactionExecutor` (experimental)

For higher throughput where you can afford a gas-coin pool:

```ts
import { ParallelTransactionExecutor } from '@mysten/sui/transactions';

const executor = new ParallelTransactionExecutor({
  client,
  signer: keypair,
  // Tuning:
  coinBatchSize: 20,              // pool size
  initialCoinBalance: 200_000_000n,
  minimumCoinBalance: 50_000_000n,
  maxPoolSize: 50,
  epochBoundaryWindow: 1000,       // ms before epoch boundary to pause
  sourceCoins,                     // optional explicit source
});
```

Schedules transactions to avoid object conflicts using a maintained gas-coin pool; auto-refills and locks around epoch boundaries. **Do not run multiple executors or other clients against the same coins concurrently** — that reintroduces the bug it's solving.

### 4. Separate owned object per thread

If multi-threaded client code can't be serialized:
- Create one owned object (e.g., a coin or a per-worker counter object) for each thread.
- Each thread signs only against its own object.
- Gas coins are the most common "shared owned object" that causes equivocation; split enough up-front so every thread has its own.

### 5. Shared-object wrapper with allowlist

When separate owned objects per thread aren't practical, wrap the contested state in a **shared object** with an allowlist. Shared objects are scheduled through consensus, so there's no version-lock issue — at the cost of a sequential bottleneck. Safe, but slower.

### 6. Gas station mitigations

Gas stations are prime equivocation targets. Best practices:

- **Don't reuse the same gas coin across users.** Maintain a pool; each tx gets a dedicated coin.
- **Sign over the full `TransactionData`** (including `GasData`) on both user and sponsor sides, so a malicious full node can't substitute gas.
- **Submit directly to a full node**, not via the sponsor, to avoid censorship and shrink the equivocation window.
- **Monitor and rate-limit users** — repeated failed txs from the same user are a signal.
- **Counterparty reputation matters.** Treat unknown sponsors as adversaries; treat unknown users the same.

## Recovery — what to do when an object is locked

`sui-tool` provides diagnostics and best-effort rescue:

```bash
# Check lock status for a specific object
sui-tool locked-object --fullnode-rpc-url <url> --id <object-id>

# Check all owned gas objects for an address
sui-tool locked-object --fullnode-rpc-url <url> --address <addr>

# Attempt to unlock (only works if the object isn't already locked by a majority)
sui-tool locked-object --rescue --fullnode-rpc-url <url> --id <object-id>
```

Rescue is only possible if **less than a majority** of validators have locked the object to competing txs. Otherwise you wait for the epoch to end.

## Error messages you'll see

- `"Failed to sign transaction by a quorum of validators because one or more of its objects is reserved for another transaction."` → another tx is holding the lock; wait for it or wait for epoch end.
- `"Failed to sign transaction … objects is equivocated until the next epoch."` → you've equivocated; no recovery except waiting.

## Quick defaults

- **Single user / wallet signer**: use `SerialTransactionExecutor`.
- **High-throughput backend**: use `ParallelTransactionExecutor` with a gas-coin pool.
- **Airdrops, batch mints, bulk transfers**: one PTB, up to 1,024 ops.
- **Sponsored flows**: sign over full `TransactionData`, submit directly to full node.
- **Never**: submit two transactions from the same signer that touch the same owned object without waiting for the first to finalize.
