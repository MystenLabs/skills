# Testnet Integration Workflow

Complete workflow for interacting with DeepBook Predict on Sui Testnet using the Sui TypeScript SDK. There is no dedicated Predict SDK — build transactions directly.

## Prerequisites

- Sui TypeScript SDK: `npm install @mysten/sui`
- Testnet SUI for gas (from the Sui faucet)
- DUSDC as quote asset (from the DeepBook Predict testnet token request form)

## Configuration

```typescript
import { SuiGrpcClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";

const PACKAGE_ID = "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138";
const PREDICT_OBJECT_ID = "0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a";
const QUOTE_TYPE = "0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC";
const SERVER_URL = "https://predict-server.testnet.mystenlabs.com";

const client = new SuiGrpcClient({ url: "https://fullnode.testnet.sui.io:443" });
const keypair = Ed25519Keypair.fromSecretKey(/* your key */);
```

All package IDs and object layouts are testnet-only and may change before Mainnet deployment.

## Step 1: Create a PredictManager

The PredictManager is a shared account that holds DUSDC and tracks positions. It must be created and shared in its own transaction before any deposits or mints.

```typescript
function createManager(): Transaction {
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::predict_manager::create_manager`,
        arguments: [tx.object(PREDICT_OBJECT_ID)],
    });
    return tx;
}
```

Extract the PredictManager object ID from the transaction's `objectChanges` (look for the created shared object with type containing `PredictManager`). Persist this ID for subsequent transactions.

**Critical:** Do not deposit or mint in the same transaction as creation. The manager is shared during this transaction, so it becomes available for use only in later transactions.

## Step 2: Fetch oracle data

Query the public Predict server for active oracles:

```typescript
const response = await fetch(`${SERVER_URL}/oracles`);
const oracles = await response.json();
```

Oracle data includes: `oracle_id`, `expiry` timestamp, available `strikes`, and the oracle's current state. Only active oracles support minting.

## Step 3: Deposit DUSDC

Deposit DUSDC into the PredictManager before minting:

```typescript
function depositDusdc(managerId: string, coinId: string, amount: number): Transaction {
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.object(coinId), [amount]);
    tx.moveCall({
        target: `${PACKAGE_ID}::predict_manager::deposit`,
        typeArguments: [QUOTE_TYPE],
        arguments: [
            tx.object(PREDICT_OBJECT_ID),
            tx.object(managerId),
            coin,
        ],
    });
    return tx;
}
```

## Step 4: Mint a binary position

### Binary up position

Pays full notional if settlement price exceeds the strike:

```typescript
function mintBinaryUp(
    managerId: string,
    oracleId: string,
    expiry: number,
    strike: number,
    quantity: number,
): Transaction {
    const tx = new Transaction();
    // Build market key for "up" direction
    const marketKey = tx.moveCall({
        target: `${PACKAGE_ID}::market_key::new_binary_up`,
        arguments: [
            tx.pure.u64(strike),
        ],
    });
    // Execute mint
    tx.moveCall({
        target: `${PACKAGE_ID}::predict::mint`,
        typeArguments: [QUOTE_TYPE],
        arguments: [
            tx.object(PREDICT_OBJECT_ID),
            tx.object(managerId),
            tx.object(oracleId),
            marketKey,
            tx.pure.u64(quantity),
            tx.object("0x6"), // Clock
        ],
    });
    return tx;
}
```

### Binary down position

Pays full notional if settlement price is at or below the strike:

```typescript
// Same as above but use:
const marketKey = tx.moveCall({
    target: `${PACKAGE_ID}::market_key::new_binary_down`,
    arguments: [tx.pure.u64(strike)],
});
```

## Step 5: Mint a vertical range position

Pays full notional if settlement price falls within `(lower_strike, higher_strike]`:

```typescript
function mintRange(
    managerId: string,
    oracleId: string,
    lowerStrike: number,
    higherStrike: number,
    quantity: number,
): Transaction {
    const tx = new Transaction();
    const marketKey = tx.moveCall({
        target: `${PACKAGE_ID}::market_key::new_range`,
        arguments: [
            tx.pure.u64(lowerStrike),
            tx.pure.u64(higherStrike),
        ],
    });
    tx.moveCall({
        target: `${PACKAGE_ID}::predict::mint`,
        typeArguments: [QUOTE_TYPE],
        arguments: [
            tx.object(PREDICT_OBJECT_ID),
            tx.object(managerId),
            tx.object(oracleId),
            marketKey,
            tx.pure.u64(quantity),
            tx.object("0x6"),
        ],
    });
    return tx;
}
```

The `lower_strike` must be less than `higher_strike`. Both must be valid grid points (minimum strike + multiples of tick size).

## Step 6: Redeem a position

### Live redemption (before settlement)

Sells the position back at current bid value:

```typescript
function redeemLive(
    managerId: string,
    oracleId: string,
    marketKey: any, // constructed as in minting
    quantity: number,
): Transaction {
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::predict::redeem`,
        typeArguments: [QUOTE_TYPE],
        arguments: [
            tx.object(PREDICT_OBJECT_ID),
            tx.object(managerId),
            tx.object(oracleId),
            marketKey,
            tx.pure.u64(quantity),
            tx.object("0x6"),
        ],
    });
    return tx;
}
```

### Post-settlement redemption

After the oracle settles, winning positions pay full notional and losing positions pay zero. Post-settlement redemptions can be executed permissionlessly by anyone.

## Step 7: LP operations

### Supply DUSDC for PLP

```typescript
function supplyLiquidity(managerId: string, amount: number): Transaction {
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::predict::supply`,
        typeArguments: [QUOTE_TYPE],
        arguments: [
            tx.object(PREDICT_OBJECT_ID),
            tx.object(managerId),
            tx.pure.u64(amount),
            tx.object("0x6"),
        ],
    });
    return tx;
}
```

Initial deposits are valued 1:1 (1 DUSDC = 1 PLP). Subsequent deposits are proportional to the vault's current NAV.

### Withdraw PLP

```typescript
function withdrawLiquidity(managerId: string, plpAmount: number): Transaction {
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::predict::withdraw`,
        typeArguments: [QUOTE_TYPE],
        arguments: [
            tx.object(PREDICT_OBJECT_ID),
            tx.object(managerId),
            tx.pure.u64(plpAmount),
            tx.object("0x6"),
        ],
    });
    return tx;
}
```

Withdrawals are subject to:
- Sufficient available liquidity after covering maximum payout obligations
- Rate limiter constraints for large withdrawals

## Verification checklist

Before relying on the integration:

1. Confirm SUI funding and DUSDC ownership
2. Fetch and verify an active oracle from the server
3. Create and persist a PredictManager ID
4. Test binary minting with sufficient deposit
5. Test range minting with valid strike pairs
6. Confirm redemption events and payout deposits
7. Test LP supply and withdrawal flows
