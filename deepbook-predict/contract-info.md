# Testnet Contract Addresses

All addresses are for Sui Testnet. These are provisional and may change before Mainnet deployment.

## Core identifiers

| Object | ID |
|--------|----|
| Package ID | `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138` |
| Registry | `0x43af14fed5480c20ff77e2263d5f794c35b9fab7e2212903127062f4fe2a6e64` |
| Predict Object | `0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a` |

## Quote asset (DUSDC)

| Property | Value |
|----------|-------|
| Type address | `0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC` |
| Decimals | 6 |
| Currency ID | `0xf3000dff421833d4bb8ed58fac146d691a3aaba2785aa1989af65a7089ca3e9c` |

Obtain DUSDC via the DeepBook Predict testnet token request form.

## PLP coin type

```
0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::plp::PLP
```

## Public server

```
https://predict-server.testnet.mystenlabs.com
```

Use this endpoint to fetch:
- Active oracles and their parameters
- Oracle IDs, expiries, and available strikes
- Current market data

## Oracle event types

Monitor these four Sui events for real-time oracle state updates:

| Event | Purpose |
|-------|---------|
| `OraclePricesUpdated` | Spot/forward prices updated |
| `OracleSVIUpdated` | SVI volatility parameters updated |
| `OracleSettled` | Oracle settled at expiry |
| `OracleActivated` | New oracle activated |

## TypeScript SDK

The `@mysten/deepbook-predict` npm package (v0.2.1) provides a dedicated TypeScript SDK for interacting with the Predict protocol:

```bash
npm install @mysten/deepbook-predict
```

This SDK wraps the raw Move calls into higher-level helpers for manager creation, minting, redemption, and LP operations. You can also build transactions directly using `@mysten/sui` for lower-level control.

## Source repository

The Predict contracts are in the `predict-testnet-4-16` branch of the [deepbookv3 repository](https://github.com/MystenLabs/deepbookv3). Key packages:

- `packages/predict/` — core Predict protocol
- `packages/propbook/` — oracle data substrate
- `packages/account/` — account wrapper and app data
- `packages/fixed_math/` — fixed-point arithmetic
- `packages/sessions/` — session-gated ephemeral trading authority
