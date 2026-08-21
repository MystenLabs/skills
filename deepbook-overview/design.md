# Architecture and Design

DeepBook V3 organizes around three primary shared objects: Pool, PoolRegistry, and BalanceManager.

## Pool structure

Each Pool manages a single market and comprises three interconnected components:

### Book

The Book maintains two `BigVector<Order>` structures — one for bids and one for asks. When a user places an order:

1. An `OrderInfo` object is created with the user's parameters
2. The Book matches it against existing maker orders on the opposite side, accumulating `Fill` data for each match
3. Any unmatched quantity is converted into an `Order` and injected into the appropriate side of the book

Orders are stored as 24-byte optimized structs. Order IDs encode both price and sequence number for efficient lookup.

### State

The State component processes all requests and maintains three submodules:

**Governance** — Manages per-pool trading parameters: taker fees, maker fees, and stake requirements. Users with non-zero DEEP stake can propose parameter changes. Voting power follows a formula combining linear and square-root components, capped at 100,000 DEEP. Proposals require 50% quorum of active stake to pass and take effect the following epoch.

Fee bounds vary by pool type:
- **Stable pools:** taker 0.1–1 bps, maker 0–0.5 bps
- **Volatile pools:** taker 1–10 bps, maker 0–5 bps
- **Whitelisted pools:** 0% fees (DEEP/SUI, DEEP/USDC)

**History** — Tracks aggregated volumes, trading parameters, and fees per epoch. Maker rebates activate when users exceed minimum stake thresholds and contribute maker volume. Rebate availability correlates inversely with trading volume relative to 28-day medians.

**Account** — Represents individual user data: volumes, stakes, voted proposals, unclaimed rebates, settled balances (owed to user), and owed balances (owed by user).

### Vault

The Vault processes settled and owed balances after each transaction, adjusting the BalanceManager accordingly. It holds three asset balances: base, quote, and DEEP.

The Vault also maintains a `DeepPrice` struct storing up to 100 recent conversion-rate points between the pool's asset and DEEP. The system divides cumulative rate by point count to calculate `deep_per_asset`, then multiplies by trade size to determine DEEP-denominated fees.

## PoolRegistry

A shared object that prevents duplicate pool creation and maintains package versioning during setup. All pool creation goes through the registry.

## BalanceManager

A shared object holding user balances across all pools. All trading operations (except direct swaps) require a BalanceManager. The BalanceManager works with `TradeProof` objects to authorize trading — a TradeProof proves that the caller is either the owner or holds a valid `TradeCap`.

The owner can mint up to 1,000 capabilities total per BalanceManager:
- **TradeCap** — enables order placement only
- **DepositCap** — allows deposits only
- **WithdrawCap** — allows withdrawals only

## BigVector

An arbitrary-sized vector implementation using an on-chain B+ tree structure. Provides near-constant-time random access, insertion, and removal through logarithmic complexity relative to maximum fan-out. Leaf nodes are exposed for efficient iteration over the order book.

## Order placement flow

The `place_limit_order` process follows four sequential steps:

1. **OrderInfo creation** — User parameters are validated and packaged into an `OrderInfo` struct
2. **Book matching** — The Book validates inputs (tick size, lot size, minimum size), matches against opposite-side orders generating `Fill` objects, and injects any remaining quantity as a resting order
3. **State processing** — Fees are calculated based on account volume and staking tier. Account volumes, governance state, and epoch history are updated
4. **Vault settlement** — Asset transfers between the Pool and BalanceManager are reconciled

### Order types

| Restriction | Value | Behavior |
|-------------|-------|----------|
| `NO_RESTRICTION` | 0 | Normal order — fills what it can, rests the remainder |
| `IMMEDIATE_OR_CANCEL` | 1 | Fills what it can immediately, cancels the rest |
| `FILL_OR_KILL` | 2 | Must fill entirely or the whole order is rejected |
| `POST_ONLY` | 3 | Must rest entirely — rejected if it would cross the book |

### Self-matching options

| Option | Value | Behavior |
|--------|-------|----------|
| `SELF_MATCHING_ALLOWED` | 0 | Default — allows self-trades |
| `CANCEL_TAKER` | 1 | Cancels the incoming taker order on self-match |
| `CANCEL_MAKER` | 2 | Cancels the resting maker order on self-match |

### Order statuses

| Status | Value |
|--------|-------|
| Live | 0 |
| Partially Filled | 1 |
| Filled | 2 |
| Canceled | 3 |
| Expired | 4 |
