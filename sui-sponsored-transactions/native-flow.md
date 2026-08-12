# Native Sponsored Transactions (TypeScript SDK)

Sourced from [docs.sui.io/concepts/transactions/sponsored-transactions](https://docs.sui.io/concepts/transactions/sponsored-transactions) and [sdk.mystenlabs.com/sui/transactions/signing-and-execution](https://sdk.mystenlabs.com/sui/transactions/signing-and-execution). Uses the current `@mysten/sui` (v2) `Transaction` API. Verify exact method names against the SDK typedoc if a lint flags them.

## The model: three roles + GasData

- **User** — wants to execute a transaction.
- **Gas station** — provides the gas payment objects.
- **Sponsor** — funds the gas station.

A `TransactionData` carries the programmable transaction (the "kind") plus a `GasData`:

```rust
pub struct GasData {
    pub payment: Vec<ObjectRef>, // gas coins — all owned by `owner`
    pub owner: SuiAddress,       // the SPONSOR
    pub price: u64,
    pub budget: u64,
}
```

The gas coins in `payment` are owned by the **sponsor** (`owner`), not the user. That is what makes the transaction sponsored.

## The dual-signature rule

Both the user and the sponsor sign the **same** `TransactionData` bytes (which include `GasData`). Execution submits **both** signatures. A single signature is not enough.

## Flow: user builds kind, sponsor adds gas

**1. User builds only the transaction kind** (no gas, no sender-owned gas coins):

```typescript
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();
// tx.moveCall({ ... }) etc.
const kindBytes = await tx.build({ client, onlyTransactionKind: true });
// send kindBytes (+ the user's address) to the sponsor backend
```

**2. Sponsor reconstructs and attaches gas data:**

```typescript
import { Transaction } from '@mysten/sui/transactions';

const sponsoredTx = Transaction.fromKind(kindBytes);
sponsoredTx.setSender(userAddress);          // the user originates the tx
sponsoredTx.setGasOwner(sponsorAddress);     // sponsor pays — GasData.owner
sponsoredTx.setGasPayment(sponsorGasCoins);  // sponsor's gas coins (ObjectRef[])
// optional overrides (otherwise auto from dry-run):
// sponsoredTx.setGasBudget(budget);
// sponsoredTx.setGasPrice(price);

const bytes = await sponsoredTx.build({ client });
```

- `Transaction.fromKind(kindBytes)` — reconstructs a `Transaction` from kind bytes so gas data can be added.
- `setSender(address)` — the transaction originator (the user).
- `setGasOwner(address)` — sets the **sponsor** as `GasData.owner`. This is the line that makes it sponsored.
- `setGasPayment(coins)` — the sponsor's gas coins, an array of `{ objectId, version, digest }`. An empty array `[]` pays from the sponsor address's gas balance instead of explicit coins.
- `setGasBudget` / `setGasPrice` — override the auto (dry-run-derived) values when needed.

**3. Both parties sign the same bytes:**

```typescript
const { signature: sponsorSignature } = await sponsorKeypair.signTransaction(bytes);
// the user signs the SAME bytes (via their wallet/keypair):
const { signature: userSignature } = await userKeypair.signTransaction(bytes);
```

`keypair.signTransaction(bytes)` returns `{ bytes, signature }`.

**4. Execute with both signatures.** Two execution clients, different param names:

```typescript
// New gRPC client — `signatures` is a string[]:
await grpcClient.executeTransaction({
  transaction: bytes,
  signatures: [userSignature, sponsorSignature],
});

// JSON-RPC SuiClient — `signature` also accepts an array for sponsored txns:
await client.executeTransactionBlock({
  transactionBlock: bytes,
  signature: [userSignature, sponsorSignature], // order can be either
  options: { showEffects: true },
});
```

The protocol's `tx_signatures` list must contain both signatures, in either order.

## The three sponsorship patterns

1. **User-proposed (`GasLessTransactionData`)** — user builds the kind (no gas) → sends to sponsor → sponsor adds gas and signs → returns to user → user signs → submits. (The flow shown above.)
2. **Sponsor-proposed** — sponsor constructs and signs the full `TransactionData` (tx + gas) → sends to user → user signs → submits.
3. **Wildcard / `GasData` object** — sponsor hands the user a `GasData` object; the user can construct and sign any valid transaction within the budget (a blanket gas station).

> Reminder: the gas coins must always be owned by the sponsor (`GasData.owner`), regardless of pattern. See `security.md` for the equivocation/locking risk that shapes how a production gas station manages those coins.
