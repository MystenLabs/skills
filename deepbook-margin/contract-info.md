# Margin Contract Addresses and Pool Parameters

All addresses are for Sui Mainnet unless noted otherwise.

> **Version drift warning:** The package ID below is sourced from [docs.sui.io](https://docs.sui.io/onchain-finance/deepbook/deepbook-margin/contract-information). On-chain versions may be ahead — the registry's `allowed_versions` field controls which versions accept calls. Calls through a disabled version abort with `EPackageVersionDisabled`. Always query the registry for the current active version before integrating.

## Package version

The table below lists the version documented on docs.sui.io. The on-chain active version may be higher.

| Version | Package ID | Date |
|---------|-----------|------|
| v3 (docs) | `0xfbd322126f1452fd4c89aedbaeb9fd0c44df9b5cedbe70d76bf80dc086031377` | Feb 10, 2026 |

**Registry ID:** `0x0e40998b359a9ccbab22a98ed21bd4346abf19158bc7980c8291908086b3a742`

## Supported assets

| Token | Type address | Decimals |
|-------|-------------|----------|
| SUI | `0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI` | 9 |
| USDC | `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC` | 6 |
| DEEP | `0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP` | 6 |
| WAL | `0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL` | 9 |
| SUIUSDE | `0x41d587e5336f1c86cad50d38a7136db99333bb9bda91cea4ba69115defeb1402::sui_usde::SUI_USDE` | 6 |

## Margin pools

All pools share: 90% maximum utilization, 20% referral spread, 0.1 minimum borrow.

| Asset | Pool ID | Supply cap |
|-------|---------|-----------|
| SUI | `0x53041c6f86c4782aabbfc1d4fe234a6d37160310c7ee740c915f0a01b7127344` | 500,000 SUI |
| USDC | `0xba473d9ae278f10af75c50a8fa341e9c6a1c087dc91a3f23e8048baf67d0754f` | 2,000,000 USDC |
| DEEP | `0x1d723c5cd113296868b55208f2ab5a905184950dd59c48eb7345607d6b5e6af7` | 30,000,000 DEEP |
| WAL | `0x38decd3dbb62bd4723144349bf57bc403b393aee86a51596846a824a1e0c2c01` | 7,000,000 WAL |
| SUIUSDE | `0xbb990ca04a7743e6c0a25a7fb16f60fc6f6d8bf213624ff03a63f1bb04c3a12f` | 1,000,000 SUIUSDE |

## Trading pair risk parameters

| Pair | Max leverage | Min borrow ratio | Min withdraw ratio | Liquidation ratio | Target liquidation ratio | Liquidator reward | Pool reward |
|------|-------------|-------------------|--------------------|--------------------|--------------------------|-------------------|-------------|
| SUI/USDC | 5x | 1.25 | 2.0 | 1.1 | 1.25 | 2% | 3% |
| WAL/USDC | 3x | 1.5 | 2.0 | 1.2 | 1.5 | 2% | 3% |
| DEEP/USDC | 3x | 1.5 | 2.0 | 1.2 | 1.5 | 2% | 3% |

## Spot vs margin comparison

| Aspect | Spot | Margin |
|--------|------|--------|
| Fund custody | Direct BalanceManager | Wrapped within MarginManager |
| Authorization | User holds TradeCap | Manager holds internal caps |
| Pool scope | One manager, all pools | One manager per pool (isolated) |
| Borrowing | Not available | Isolated pools, one side at a time |
| Order entry | Direct pool placement | Pool proxy with risk checks |
| Oracle dependency | None | Required for all operations |
| Withdrawal | Anytime | Gated by min withdraw risk ratio |
| Costs | Trading fees only | Fees + accruing interest |
| Liquidation | Not possible | Permissionless at threshold |

## Event families

Margin emits distinct events through multiple packages:

- **`margin_manager`** — creation, deposit/withdrawal, loan borrow/repay, liquidation
- **`margin_liquidation`** — vault-triggered liquidations
- **`margin_pool`** — pool creation, asset supply/withdrawal, fees, referrals
- **`margin_registry`** — pool registration, config updates, price age/tolerance changes

Integrators caching per-pool parameters must watch governance events, as governance can change them.
