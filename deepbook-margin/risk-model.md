# Risk Ratio, Interest Rates, and Liquidation

## Risk ratio

The risk ratio is the central metric for all margin operations:

```
risk_ratio = total_assets / total_debt
```

A higher ratio indicates a safer position. Examples:
- 2.0 ratio = 50% LTV (loan-to-value)
- 1.25 ratio = 80% LTV
- 1.0 ratio = 100% LTV (insolvent)

The ratio changes with market price movements (oracle-valued, not execution price) and interest accrual on borrowed amounts.

## Four risk thresholds

All thresholds are stored per-pool in the `MarginRegistry` and set by governance. The ordering always holds: `liquidation < target_liquidation <= min_borrow < min_withdraw`.

| Threshold | Typical value | Controls |
|-----------|--------------|----------|
| Min withdraw risk ratio | 2.0 | Withdrawals blocked below this |
| Min borrow risk ratio | 1.25–1.5 | Borrowing blocked below this; sets max leverage |
| Target liquidation risk ratio | 1.25–1.5 | Liquidation restores position to this level |
| Liquidation risk ratio | 1.0–1.2 | Permissionless liquidation triggered at or below this |

## Leverage calculation

Maximum leverage is determined by the min borrow risk ratio:

```
max_leverage ≈ 1 / (1 - 1/min_borrow_risk_ratio)
```

| Min borrow ratio | Max leverage |
|------------------|-------------|
| 1.25 | ~5x |
| 1.5 | ~3x |
| 2.0 | ~2x |

Higher-volatility assets carry stricter parameters (lower max leverage).

## Worked example: SUI/USDC at 5x

1. **Opening:** Deposit 100 USDC + borrow 400 USDC = 500 USDC total assets, 400 USDC debt. Risk ratio = 500/400 = 1.25
2. **10% price increase:** Assets rise to 540 USDC. Risk ratio = 540/400 = 1.35 (safer)
3. **10% price decrease:** Assets fall to 460 USDC. Risk ratio = 460/400 = 1.15 (warning zone)
4. **15% price decrease:** Assets fall to 430 USDC. Risk ratio = 430/400 = 1.075. Below 1.1 liquidation threshold — position is liquidated

At 5x leverage, a 10% adverse price move loses 50% of equity.

## Interest rate model

Margin pools use a kinked utilization model where borrow costs rise gradually until an optimal point, then spike sharply.

### Utilization

```
utilization = total_borrow / total_supply
```

### Borrow rate formulas

**Below optimal utilization:**
```
borrow_rate = base_rate + utilization × base_slope
```

**Above optimal utilization:**
```
borrow_rate = base_rate + optimal_utilization × base_slope + (utilization - optimal_utilization) × excess_slope
```

### Per-pool parameters

| Asset | Base rate | Base slope | Optimal util | Max util | Excess slope |
|-------|-----------|------------|--------------|----------|--------------|
| USDC | 0% | 15% | 80% | 90% | 500% |
| SUIUSDE | 0% | 15% | 80% | 90% | 500% |
| SUI | 3% | 20% | 80% | 90% | 500% |
| DEEP | 5% | 25% | 80% | 90% | 500% |
| WAL | 5% | 25% | 80% | 90% | 500% |

### Rate examples (USDC pool)

| Utilization | Borrow APR |
|-------------|-----------|
| 50% | 7.5% |
| 80% (optimal) | 12% |
| 85% | 37% |
| 90% (max) | 62% |

The kink effect is dramatic: from 12% at optimal to 62% at maximum utilization.

### Supply rate

Suppliers don't receive the full borrow rate:

```
supply_rate = borrow_rate × utilization × (1 - protocol_spread)
```

Idle liquidity earns nothing, and the protocol extracts a spread. Protocol fees distribute: 50% referrals, 25% protocol treasury, 25% pool maintainers.

### Interest accrual

Interest compounds at event-driven intervals (not continuously):

```
interest = total_borrow × borrow_rate × (elapsed_ms / YEAR_MS)
```

Both borrower and supplier positions use share-based accounting where accrual increases conversion ratios without modifying share counts.

## Liquidation mechanics

### Trigger

Liquidation becomes permissionless when `risk_ratio <= liquidation_risk_ratio`. There is no grace period and no protocol intervention.

### Process

1. Liquidator checks eligibility via `can_liquidate`
2. Capital sourced from shared liquidation vault
3. `margin_manager::liquidate` repays part of the borrower's debt
4. Liquidator receives collateral reward (typically 2%)
5. Margin pool receives additional reward (typically 3%)
6. Position restored toward `target_liquidation_risk_ratio` (partial liquidation)

### Outcomes

- **Partial liquidation:** Enough collateral remains. Position survives at target risk ratio.
- **Full liquidation:** Deeply underwater. All collateral consumed; pool absorbs bad debt.
- **Collateral loss is permanent.** Rewards taken from collateral are not recoverable.

## Margin risks

### Liquidation risk

The primary danger. Crypto markets can move 10–20% in hours. At 5x leverage, a 15% adverse move triggers liquidation. A warning zone exists just above the threshold (e.g., 1.1–1.2 for SUI/USDC) where minor price swings trigger liquidation.

### Interest rate risk

Rates follow the kinked model and can spike dramatically. A position borrowing 400 USDC faces daily interest charges jumping from ~$0.13/day at 12% APR to ~$0.62/day at 57% APR. Extended positions drift toward liquidation through accumulated interest alone.

### Leverage amplification

| Leverage | Price move | Equity impact |
|----------|-----------|--------------|
| 2x | -10% | -20% |
| 3x | -10% | -30% |
| 5x | -10% | -50% |

### Oracle risk

Risk calculations depend on Pyth oracle prices. Staleness checks exist (maximum price age threshold), but prices can lag by up to 60 seconds. Confidence interval validation and EWMA price verification provide additional protection.

### Mitigation strategies

- Use 2–3x leverage instead of maximum
- Monitor risk ratios during volatile periods
- Deploy take profit / stop loss orders above liquidation price
- Maintain collateral reserves for emergency deposits
- Start with small positions before scaling
