# Sui Bridge -- Architecture and Usage

> Source: [docs.sui.io/concepts/tokenomics/sui-bridging](https://docs.sui.io/concepts/tokenomics/sui-bridging)

## Overview

Sui Bridge is the native bridge for the Sui network, integrated into core architecture. It enables asset movement between Sui and other blockchains.

Access: Bridge tokens at bridge.sui.io.

---

## Operation and Governance

Sui validators operate and govern Sui Bridge. Bridge transfers and other actions require validator signatures with a threshold of voting power. Governance occurs through validator voting.

### Security Architecture

Sui validators (the same entities securing the network) operate the bridge. Actions require a threshold of validator voting power.

### Security Audits

Third-party audits have been conducted by OtterSec and Zellic.

### Source Code

Open source: Move, Solidity, Bridged ETH, bridge node, and bridge indexer implementations.

---

## Supported Assets

| Asset | Symbol |
|-------|--------|
| Wrapped Bitcoin | WBTC |
| Lombard Staked Bitcoin | LBTC |
| Ethereum | ETH |
| Wrapped Ethereum | WETH |
| Tether | USDT |

---

## Package IDs and Addresses

| Component | ID/Address |
|-----------|-----------|
| Sui Bridge package | `0xb` |
| Sui Bridge object | `0x9` |
| Ethereum contract | `0xda3bD1fE1973470312db04551B65f401Bc8a92fD` |
| ETH on Sui | `0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH` |
| WETH on Ethereum | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` |

---

## Global Limiter

The global limiter constrains total asset value leaving the bridge within 24 hours.

| Direction | Daily Limit |
|-----------|------------|
| Ethereum to Sui | $16 million |
| Sui to Ethereum | $7 million |

ETH is priced at $2,600 for limit calculations.

---

## Transfer Parameters

- No minimum transfer requirement.
- Minimal value: 0.00000001 ETH/WETH.
- Maximum: Current global USD limit.
- 8-decimal precision for ETH/WETH.

---

## Finality Requirements

**Ethereum to Sui:** Requires configurable Ethereum block confirmations before minting.

**Sui to Ethereum:** Requires Sui transaction finality before releasing tokens.

> "Do not credit the user until the bridge transfer is fully confirmed on the destination chain."
