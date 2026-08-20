# Position Types, Oracle Lifecycle, and Pricing

## Binary positions

Binary positions pay a fixed notional if a condition is met at settlement, or zero otherwise.

### Key structure

```
(oracle_id, expiry, strike, is_up)
```

- `oracle_id` — the OracleSVI object ID for the underlying asset
- `expiry` — timestamp when the position settles
- `strike` — the price threshold
- `is_up` — direction: `true` pays if settlement price > strike; `false` pays if settlement price <= strike

### Payoff

| Position | Settlement > strike | Settlement <= strike |
|----------|--------------------|--------------------|
| Up | Full notional | Zero |
| Down | Zero | Full notional |

Binary positions are European-style (can only be exercised at expiry, not before). Before settlement, they can be redeemed at current bid value (live redemption).

## Vertical range positions

Range positions pay fixed notional if the settlement price lands within a specified band, or zero if outside.

### Key structure

```
(oracle_id, expiry, lower_strike, higher_strike)
```

- `lower_strike` — the lower bound of the range (must be less than `higher_strike`)
- `higher_strike` — the upper bound of the range

The payout region is `(lower_strike, higher_strike]` — the lower bound is exclusive and the upper bound is inclusive.

### Payoff

| Settlement price | Payout |
|-----------------|--------|
| Within `(lower_strike, higher_strike]` | Full notional |
| Outside the range | Zero |

Strikes conform to a grid: minimum strike plus multiples of tick size. Both strikes must be valid grid points.

## Oracle lifecycle

Each OracleSVI object transitions through four states:

```
Inactive → Active → Pending Settlement → Settled
```

### Inactive

The oracle exists but is not yet powered. No minting allowed.

### Active

The oracle accepts price updates and minting is enabled. Oracle data includes:
- Spot price and forward price per expiry
- SVI (Stochastic Volatility Inspired) parameters for implied volatility
- Activation status

Minting requires an active oracle. The mint succeeds only when:
- The oracle is live
- The quote asset is accepted
- The market key matches the oracle
- The manager holds enough deposited DUSDC

### Pending settlement

After the expiry timestamp passes, the oracle enters pending settlement. No new mints allowed. Live redemptions still work at current bid values.

### Settled

The oracle records the exact spot price at the expiry timestamp. Positions can now be redeemed at their settlement value:
- **Winning binary positions** (correct direction) → full notional
- **Losing binary positions** (wrong direction) → zero
- **In-band range positions** → full notional
- **Out-of-band range positions** → zero

Post-settlement redemptions can be executed permissionlessly by anyone, not just the position holder.

## Oracle data sources

Predict uses oracle feeds for pricing positions. The oracle provides spot prices, forward prices per expiry, and SVI (Stochastic Volatility Inspired) parameters for implied volatility.

## Settlement mechanics

1. After the expiry timestamp passes, the oracle enters pending settlement
2. Settlement records the spot price at the expiry timestamp
3. The oracle transitions to "settled" state
4. Winning positions can be redeemed for full notional
5. Losing positions redeem for zero
6. Vault exposure for that expiry is unwound

## Pricing

### Premium calculation

The premium per unit equals the risk-neutral probability that the position pays out (stored as a 1e9 fixed-point value).

For binary positions: probability derived from the forward price and SVI volatility surface.

### Fees

Fees include multiple components:
- **Variance-based fee** — `sqrt(p × (1-p))` where p is the probability
- **Expiry ramp** — increases as expiry approaches
- **Builder fee** — per-builder order-flow fee
- **Congestion surcharge** — applied during high activity

### Forward price

Calculated as: `forward = spot × basis` when the Pyth feed is fresh, or falls back to the Block Scholes forward price.

## Vault and PLP model

### How the vault works

The vault takes the opposite side of every trade. When a trader mints a position:
1. The trader pays the premium (probability-based price + fees)
2. The vault reserves the potential payout liability
3. The vault's mark-to-market liability adjusts

### Liquidity providers (PLP)

Liquidity providers deposit DUSDC into the vault and receive PLP (Predict LP) tokens:
- Initial deposits are valued 1:1 (1 DUSDC = 1 PLP)
- Subsequent deposits and withdrawals are proportional to the vault's current NAV
- LP returns track vault P&L directly

### Exposure limits

The vault enforces exposure limits through total mark-to-market liability checks against configured thresholds. Minting is capped by exposure limits relative to vault value.

### Withdrawal constraints

- Withdrawals require sufficient available liquidity after covering maximum payout obligations
- A rate limiter may throttle large withdrawals
