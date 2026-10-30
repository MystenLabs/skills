---
name: deepbook-predict
description: >
  Guides DeepBook Predict integration on Sui: expiry-based prediction markets
  where every position is a strike range, minting and redeeming positions,
  market lifecycle and settlement, order ID handling, and the PoolVault/PLP
  liquidity pool. Use when the user asks about DeepBook Predict, Sui prediction
  markets, binary, directional, or range positions, strikes and expiry, quoting,
  settlement or try_settle, market states, PLP shares, the predict vault,
  quoteCoinType, or code importing `@mysten/deepbook-v3/predict`. For spot
  trading use the `deepbook-sdk` skill; for margin, `deepbook-margin`; for
  architecture, `deepbook-overview`.
---

# DeepBook Predict

Expiry-based prediction markets on Sui. Each market covers one underlying and one expiry timestamp. Predict is not a perpetual market.

If an API or parameter is not shown here or in the reference files, check docs.sui.io and the `deepbookv3` repository rather than extrapolating from other prediction protocols.

## Quick start

```ts
import { DeepBookClient } from '@mysten/deepbook-v3';
import { getConfig } from '@mysten/deepbook-v3/predict';

// Deployment IDs and coin types are per-network. Never hardcode a symbol.
const config = getConfig(network);           // 'testnet' | 'mainnet'
const collateral = config.quoteCoinType;

// `active` means live and NOT YET SETTLED — expired-but-unsettled markets are
// still returned here, and quoting against them aborts.
const markets = await client.predict.read.markets();
const tradable = markets.filter((m) => !m.is_settled);
```

## Task: explain Predict and its position types

- **Every position is a range contract.** It pays a fixed amount if the settlement price lands inside the chosen strike range, and nothing otherwise.
- **A directional ("binary") position is a one-sided range.** Side `up` pays when settlement lands above the strike; side `down` pays when it lands at or below it.
- **Quantity is the maximum payout in USDC**, not a share count, and must be a whole lot of 0.01 USDC (10,000 base units at 6 decimals).
- **Liquidity providers** supply USDC to a shared pool, receive PLP shares, and take the other side of every trade.

Payoff detail and worked examples: `positions-and-oracles.md`.

## Task: mint a position in TypeScript

Checklist:

1. `getConfig(network)` → deployment IDs and `quoteCoinType`.
2. `client.predict.read.markets()` → pick a market that is not settled.
3. Build the mint call (market, side or strike range, quantity in whole 0.01 USDC lots). Exact argument names: `workflow.md`.
4. Execute, then decode the order ID from the **transaction result** — it exists nowhere else.
5. Persist `{ marketId, orderId }` together.
6. Re-read the order ID after any partial close.

```ts
const tx = new Transaction();
client.predict.mint(tx, mintArgs); // see workflow.md for mintArgs

const result = await suiClient.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
  options: { showEvents: true, showObjectChanges: true },
});

const { orderId } = client.predict.decode.mint(result);
await store.save({ marketId, orderId }); // both, always
```

Why both IDs: an order ID is unique only inside one market, so redeem and claim need the market ID alongside it. Closing part of a position replaces the order ID with a new one — the old ID no longer resolves.

## Task: market states and settlement

- `active` means live and not yet settled. It does **not** mean "not expired".
- An expired market that nobody has settled is still returned by `read.markets()`, and quoting against it aborts.
- Read the lifecycle state from the market — `is_settled`, or `try_settlement_price` — instead of comparing the expiry timestamp to the clock.
- A market becomes settled when someone calls `try_settle` and it succeeds. The gap between expiry and settlement has no fixed duration.
- After settlement, positions are claimed/redeemed against the settlement price: full notional if the price landed in range, zero otherwise.

```ts
const price = await client.predict.read.try_settlement_price(marketId);
if (!price) {
  // expired or not: still unsettled — do not quote, do not claim
}
```

State machine detail: `positions-and-oracles.md`.

## Task: vault and PLP liquidity

- The Predict pool, **PoolVault**, is the counterparty to every trade.
- Liquidity providers deposit the pool's collateral coin (USDC) and receive **PLP** shares — a 6-decimal coin matching USDC's decimals.
- PLP is a proportional claim on pool value, so its value tracks pool profit and loss rather than paying a fixed yield.
- Read the exact collateral coin type from `getConfig(network).quoteCoinType`; do not assume a symbol.
- Withdrawals require available liquidity after covering maximum payout obligations, and large withdrawals may be throttled.

Supply/withdraw calls: `workflow.md`.

## Task: common mistakes

| Mistake | Do instead |
|---|---|
| Assuming the collateral coin symbol | Read `getConfig(network).quoteCoinType` |
| Inferring settlement from the expiry timestamp | Read `is_settled` or `try_settlement_price` |
| Quoting an expired market from `read.markets()` | Filter out unsettled-but-expired markets; quoting them aborts |
| Hardcoding package or object IDs | Treat them as pinned to a deployment; read them for the target network |
| Storing only the order ID | Store `{ marketId, orderId }`; order IDs are market-scoped |
| Reusing an order ID after a partial close | Decode the new order ID from that transaction's result |
| Quantity that is not a whole 0.01 USDC lot | Round to whole lots; quantity is maximum payout |
| Treating positions as perpetual | Every position expires and is claimed after settlement |

## Reference files

- `positions-and-oracles.md` — payoffs, market lifecycle, settlement mechanics, vault/PLP model.
- `workflow.md` — exact call arguments for mint, redeem, claim, LP supply and withdraw.
- `contract-info.md` — per-deployment IDs, coin types, server endpoint, event types.
