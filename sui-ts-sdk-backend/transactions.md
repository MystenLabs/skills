# Building, Coins, and Execution

> Source: [sdk.mystenlabs.com/sui/transactions](https://sdk.mystenlabs.com/sui/transactions/basics)

---

## Coin access: `tx.coin()` and `tx.balance()`

These are the recommended way to access funds in a transaction. They automatically resolve from both address balances and coin objects.

### `tx.coin()` — produces a `Coin<T>`

Use for transfers, Move functions that accept `Coin<T>`, and standard coin operations.

```typescript
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();

// Get 1 SUI (in MIST — 1 SUI = 1_000_000_000 MIST)
const coin = tx.coin({ balance: 1_000_000_000n });

// Get a specific coin type
const usdcCoin = tx.coin({
  balance: 1_000_000n,
  type: '0x...::usdc::USDC',
});

// Transfer it
tx.transferObjects([coin], '0xRecipientAddress');
```

### `tx.balance()` — produces a `Balance<T>`

Use for Move functions that accept `Balance<T>` directly.

```typescript
const bal = tx.balance({ balance: 500_000_000n });
// Pass to a Move function expecting Balance<SUI>
tx.moveCall({
  target: '0x...::my_module::deposit',
  arguments: [someObject, bal],
});
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `balance` | `bigint` | required | Amount in base units |
| `type` | `string` | `'0x2::sui::SUI'` | Coin type |
| `useGasCoin` | `boolean` | `true` | Set `false` for sponsored transactions |

### How resolution works at build time

1. If the address balance alone is sufficient, the SDK uses a direct withdrawal (no versioned object inputs needed).
2. Otherwise, it fetches coin objects and address balance in parallel, then merges and splits as needed.
3. A zero-balance request resolves to `balance::zero` with no network lookups.

---

## Address balances vs coin objects

Sui has two ways of holding fungible tokens:

| | Coin Objects | Address Balances |
|--|-------------|-----------------|
| Structure | Individual on-chain objects with unique ID, version, digest | Accumulator per address per coin type |
| Concurrency | Each coin is a versioned object — using it requires the exact version | No versions — concurrent transactions from the same address work |
| Management | Must manually split/merge | Deposits automatically merge |

An address's total balance = sum of coin object balances + address balance.

### Query balance

```typescript
const { balance } = await client.getBalance({ owner: address });
// balance contains: totalBalance, coinObjectBalance, addressBalance (as strings)
const total = BigInt(balance.totalBalance);
```

### List individual coin objects

```typescript
const coins = await client.listCoins({
  owner: address,
  coinType: '0x2::sui::SUI',
});
```

---

## Manual coin operations

When you need explicit control over coin objects:

### Split coins

```typescript
const [coin1, coin2] = tx.splitCoins('0xMyCoinId', [1_000_000n, 2_000_000n]);
```

### Merge coins

```typescript
tx.mergeCoins('0xCoin1', ['0xCoin2', '0xCoin3']);
```

### Deposit into address balance

```typescript
tx.moveCall({
  target: '0x2::coin::send_funds',
  arguments: [coin, recipientAddress],
  typeArguments: ['0x2::sui::SUI'],
});
```

### Withdraw from address balance

Use `tx.withdrawal()` to create a withdrawal input, then redeem via Move:

```typescript
const withdrawal = tx.withdrawal({ balance: 1_000_000_000n });
tx.moveCall({
  target: '0x2::coin::redeem_funds',
  arguments: [withdrawal],
  typeArguments: ['0x2::sui::SUI'],
});
```

---

## Signing and executing from a backend

### Direct sign and execute (simplest)

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';

const keypair = Ed25519Keypair.fromSecretKey('suiprivkey1...');
const client = new SuiGrpcClient({ network: 'testnet' });

const tx = new Transaction();
tx.transferObjects(
  [tx.coin({ balance: 1_000_000_000n })],
  '0xRecipient',
);

const result = await keypair.signAndExecuteTransaction({
  transaction: tx,
  client,
});
```

This automatically sets the sender to the keypair's address, builds the transaction, signs it, and executes it. Results include transaction data and effects by default.

### Separate sign then execute

Use when you need to inspect bytes before execution, or for multi-party signing:

```typescript
tx.setSender(keypair.toSuiAddress());
const bytes = await tx.build({ client });
const { signature } = await keypair.signTransaction(bytes);

// Execute later
const result = await client.executeTransaction({
  transaction: bytes,
  signature,
});
```

---

## Result handling

Transaction results are discriminated unions. Always check the outcome:

```typescript
if (result.$kind === 'FailedTransaction') {
  // Executed on-chain but Move call aborted. Gas was still consumed.
  console.error('Failed:', result.FailedTransaction.status.error?.message);
} else {
  // Success
  console.log('Digest:', result.Transaction.digest);
}
```

A result that is not `Rejected` is not necessarily a success. Always check for `FailedTransaction`.

---

## Waiting for indexing

After a transaction executes, read APIs may not immediately reflect the effects. Always wait before dependent reads:

```typescript
await client.waitForTransaction({ result });

// Now safe to read updated state
const { balance } = await client.getBalance({ owner: address });
```

---

## Gasless stablecoin transfers

Qualified stablecoin transfers can execute with zero gas using `0x2::balance::send_funds`:

```typescript
const tx = new Transaction();
tx.moveCall({
  target: '0x2::balance::send_funds',
  arguments: [tx.balance({ balance: 1_000_000n, type: USDC_TYPE }), recipient],
  typeArguments: [USDC_TYPE],
});

// gRPC/GraphQL transports automatically detect eligible transactions
// and set gas price/budget to 0
const result = await keypair.signAndExecuteTransaction({ transaction: tx, client });
```

The gRPC and GraphQL transports automatically detect and configure eligible gasless transactions. The sender does not need any SUI balance.
