# Sponsored Transactions

> Source: [sdk.mystenlabs.com/sponsor](https://sdk.mystenlabs.com/sponsor/basic-usage)

Sponsored transactions let a backend pay gas on behalf of users. The `@mysten-incubation/sponsor` package provides the recommended flow.

---

## Install

```bash
npm install @mysten-incubation/sponsor @mysten/sui
```

---

## Recommended flow: client-builds, backend co-signs

The recommended pattern is that the **client builds the full transaction bytes** and the **backend validates, co-signs, and executes**.

### Why client-builds is preferred

The sponsor sees the exact bytes it is co-signing before committing. This prevents the sponsor from unknowingly signing malicious transactions.

> "Prefer services that expect already-built bytes plus the user's signature."

### Flow

```
1. Client fetches sponsor address from backend /config endpoint
2. Client builds transaction with sponsor as gas owner (empty gas payment)
3. User signs the transaction bytes
4. Client sends bytes + user signature to backend
5. Backend validates, co-signs, and executes
6. Backend returns result to client
```

---

## Address-balance sponsorship (simpler)

The sender can sign before the sponsor, enabling simpler async flows.

### Client side

```typescript
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();
tx.moveCall({ target: '0x...::module::function', arguments: [...] });

// Set empty gas payment to signal address-balance sponsorship
tx.setGasPayment([]);
tx.setSender(userAddress);
tx.setGasOwner(sponsorAddress); // from /config endpoint

const bytes = await tx.build({ client });
const { signature: userSignature } = await userKeypair.signTransaction(bytes);

// Send bytes + userSignature to backend
```

### Backend side

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const sponsorKeypair = Ed25519Keypair.fromSecretKey(process.env.SPONSOR_KEY!);

// Validate the transaction (check target, amounts, etc.)
// ...

// Co-sign
const { signature: sponsorSignature } = await sponsorKeypair.signTransaction(bytes);

// Execute with both signatures
const result = await client.executeTransaction({
  transaction: bytes,
  signatures: [userSignature, sponsorSignature],
});
```

---

## Coin-based sponsorship

When address balances are not used, the sponsor provides specific coin objects for gas:

### Flow

```
1. User builds transaction kind bytes (no gas info)
2. Sponsor wraps with gas coin objects and gas owner address
3. Both parties sign the full transaction bytes
4. Either party executes with both signatures
```

```typescript
// User side: build kind-only
const tx = new Transaction();
tx.moveCall({ target: '0x...::module::function', arguments: [...] });

const kindBytes = await tx.build({ client, onlyTransactionKind: true });

// Send kindBytes to sponsor
```

```typescript
// Sponsor side: wrap with gas info
const sponsoredTx = Transaction.fromKind(kindBytes);
sponsoredTx.setSender(userAddress);
sponsoredTx.setGasOwner(sponsorKeypair.toSuiAddress());
sponsoredTx.setGasPayment([gasCoinsFromSponsor]);
sponsoredTx.setGasBudget(50_000_000n);
sponsoredTx.setGasPrice(1000n);

const fullBytes = await sponsoredTx.build({ client });
const { signature: sponsorSig } = await sponsorKeypair.signTransaction(fullBytes);

// Return fullBytes + sponsorSig to user for their signature
```

---

## Important: `useGasCoin: false`

When the sender is transferring tokens in a sponsored transaction, set `useGasCoin: false` on coin access calls:

```typescript
const coin = tx.coin({ balance: 1_000_000_000n, useGasCoin: false });
tx.transferObjects([coin], recipient);
```

This prevents the SDK from attempting to split the sponsor's gas coin for the sender's transfer.

---

## Config endpoint pattern

Backends should expose a `/config` endpoint returning the current sponsor address. This allows dynamic sponsor address rotation without client redeployment:

```typescript
// Backend
app.get('/config', (req, res) => {
  res.json({ sponsorAddress: sponsorKeypair.toSuiAddress() });
});
```

---

## Result handling

Backend receives one of three outcomes:

| Result | Meaning | Action |
|--------|---------|--------|
| `Rejected` | Policy validation failed; transaction was never executed or signed | Return error to user |
| `FailedTransaction` | Executed on-chain but Move call aborted; sponsor still pays gas | Log failure, return error |
| `Transaction` | Successful execution | Return digest to user |

Always check:

```typescript
if (result.$kind === 'Rejected') {
  // Never executed
} else if (result.$kind === 'FailedTransaction') {
  // Executed but failed — gas was consumed
} else {
  // Success
  console.log('Digest:', result.Transaction.digest);
}
```
