# Leveraged Position Lifecycle

Complete SDK workflow for opening, monitoring, and closing a leveraged position on DeepBook Margin.

## Prerequisites

- Current Sui CLI (`suiup update sui`)
- Testnet SUI for collateral and gas
- SDK installation: `npm install @mysten/deepbook-v3 @mysten/sui`
- Sufficient borrow liquidity in the target margin pool

## SDK setup

The SDK auto-loads margin package IDs and Pyth configuration on Testnet. Reference pools, coins, and managers by key rather than hardcoding IDs.

```typescript
import { DeepBookClient } from "@mysten/deepbook-v3";

export type DeepBookMarginClient = ClientWithExtensions<{ deepbook: DeepBookClient }>;

export function marginClient(address: string, options?: {
    marginManagers?: { [key: string]: MarginManager };
    balanceManagers?: { [key: string]: BalanceManager };
}): DeepBookMarginClient
```

## Step 1: Create or find a MarginManager

A MarginManager is bound to exactly one DeepBook pool. Discover existing managers before creating new ones to avoid fragmenting collateral.

### Discovery

```typescript
export async function findMarginManagerId(
    client: DeepBookMarginClient,
    owner: string,
    poolKey: string,
): Promise<string | undefined>
```

Retrieves manager IDs tracked by the registry for an owner, then filters by `poolKey`. A manager for a different pool is skipped.

### Creation

```typescript
export function createMarginManager(
    client: DeepBookMarginClient,
    poolKey: string,
): Transaction
```

A single `margin_manager::new` call creates, shares, and registers the manager. Read the created shared object ID from transaction effects and persist it.

## Step 2: Read risk parameters

```typescript
export interface RiskParams {
    liquidationRiskRatio: number;
    minBorrowRiskRatio: number;
    minWithdrawRiskRatio: number;
    targetLiquidationRiskRatio: number;
    userLiquidationReward: number;
    poolLiquidationReward: number;
}

export async function readRiskParams(
    client: DeepBookMarginClient,
    poolKey: string,
): Promise<RiskParams>
```

Every threshold is stored per-pool in the `MarginRegistry` and set by governance, not fixed in code. The ordering `liquidation < minBorrow < minWithdraw` always holds.

Example values for SUI/DBUSDC on testnet:
- Liquidation risk ratio: 1.1
- Min borrow risk ratio: 1.2499
- Min withdraw risk ratio: 2.0
- Target liquidation risk ratio: 1.25
- User liquidation reward: 0.02
- Pool liquidation reward: 0.03

## Step 3: Check borrow liquidity

```typescript
export interface BorrowLiquidity {
    totalSupply: number;
    totalBorrow: number;
    maxUtilizationRate: number;
    interestRate: number;
    borrowableNow: number;
}

export async function readBorrowLiquidity(
    client: DeepBookMarginClient,
    coinKey: string,
): Promise<BorrowLiquidity>
```

Available liquidity: `maxUtilizationRate × totalSupply - totalBorrow = borrowableNow`. Verify this is positive before borrowing. Interest rates rise with utilization.

## Step 4: Deposit collateral

```typescript
export function depositBaseCollateral(
    client: DeepBookMarginClient,
    managerKey: string,
    amount: number,
): Transaction
```

Use `depositBase` for the base asset (e.g., SUI in SUI/USDC) and `depositQuote` for the quote asset. A `safeCollateralAmount` helper ensures you never deposit more than your wallet holds while maintaining a gas reserve.

## Step 5: Borrow to open leverage

```typescript
export function borrowQuote(
    client: DeepBookMarginClient,
    managerKey: string,
    amount: number,
): Transaction
```

The pool rejects borrows that would breach the min borrow risk ratio. Size the borrow from the risk parameters — the ceiling on how much you can borrow per unit of collateral sets your maximum leverage.

## Step 6: Place margin orders

```typescript
export function openLongPosition(
    client: DeepBookMarginClient,
    marginManagerKey: string,
    poolKey: string,
    clientOrderId: string,
    price: number,
    quantity: number,
): Transaction
```

Margin orders route through the pool proxy, not spot order entry. This keeps borrow and trade bound to the manager. `clientOrderId` must be a numeric string. Price and quantity must respect the pool's tick and lot sizes.

## Step 7: Monitor risk ratio

```typescript
export interface RiskStatus {
    riskRatio: number;
    baseDebt: string;
    quoteDebt: string;
    marginToLiquidation: number;
    liquidatable: boolean;
}

export async function readRiskStatus(
    client: DeepBookMarginClient,
    marginManagerKey: string,
    params: RiskParams,
): Promise<RiskStatus>
```

`getMarginManagerState` values collateral and debt through Pyth oracles. The ratio moves with price changes and drifts down as interest accrues. If the Pyth price exceeds the pool's maximum age, valuation reverts rather than acting on stale data.

## Step 8: Close the position

### Reduce position (sell)

```typescript
export function reduceLongPosition(
    client: DeepBookMarginClient,
    marginManagerKey: string,
    poolKey: string,
    clientOrderId: string,
    price: number,
    quantity: number,
): Transaction
```

Reduce-only orders guarantee the position can only shrink, never flip or add leverage.

### Repay debt

```typescript
export function repayQuote(
    client: DeepBookMarginClient,
    managerKey: string,
    amount?: number,
): Transaction
```

Omit `amount` to repay the full outstanding balance (including accrued interest). Specify an amount to repay partially.

## Step 9: Withdraw collateral

```typescript
export function withdrawBaseCollateral(
    client: DeepBookMarginClient,
    managerKey: string,
    amount: number,
): Transaction
```

Withdrawals must leave risk ratio at or above `minWithdrawRiskRatio`. Repay all debt first, then withdraw.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Borrow aborts on risk ratio | Deposit more collateral or borrow less; check `getMinBorrowRiskRatio` |
| Withdraw aborts on risk ratio | Repay debt first; maintain ratio at or above min withdraw level |
| Insufficient pool liquidity | Check `borrowableNow`; borrow less or wait for supply |
| Stale price reverts valuation | Refresh Pyth price feed before risk-reading or trading |
| BigInt conversion error | Use numeric string for `clientOrderId` (e.g., timestamp) |
| New manager each run | Persist existing manager ID; create only when absent |
