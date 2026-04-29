---
name: sui-cli
description: >
  Sui CLI usage and network configuration. Use when the user asks about the sui
  command-line tool, creating or managing addresses, switching networks (Mainnet,
  Testnet, Devnet, Localnet), checking balances, publishing or upgrading packages
  from the CLI, gas costs, gas budgets, faucets, epochs, or sui client configuration.
  Also use when the user runs sui commands and gets errors.
---

# Sui CLI and Network

> **Source constraint:** All information in this skill is sourced exclusively from [docs.sui.io](https://docs.sui.io). When extending or updating this skill, only pull from this source. Do not use third-party blogs, tutorials, or unofficial documentation.

The Sui CLI (`sui`) is the primary tool for interacting with Sui networks from the command line. Install it through `suiup`, which also supports installing other Sui Stack components like Walrus and MVR.

---

## Sui addresses and accounts

A Sui address is a unique 32-byte identifier displayed in hexadecimal with a `0x` prefix:

```
0x02a212de6a9dfa3a69e22387acfbafbb1a9e591bd9d636e7895dcfc8de05f331
```

Addresses derive from a cryptographic hash of a public key. Each public key has a corresponding private key that grants access to the address and its owned objects. Together, an address and its key pair constitute an account.

Key facts about Sui addresses:

- No personally identifying information is required to create one.
- An individual can create multiple addresses.
- Every address has a 12-word recovery phrase generated at creation time. Sui displays this phrase only once and does not store it.
- Sui supports the ed25519 key scheme for generating new addresses.
- Private keys are stored locally in `~/.sui/sui_config/sui.keystore` (macOS/Linux) or `%USERPROFILE%\.sui\sui_config\sui.keystore` (Windows).
- Addresses can have human-readable aliases (for example, `vigorous-spinel`) used in place of the full hex string.

## Configuration

Sui stores its configuration in `~/.sui/sui_config/client.yaml`. This file contains:

- Network environment connections (Mainnet, Testnet, Devnet, Localnet)
- The active environment and active address
- The keystore file location

Running `sui client` for the first time generates this file, creates a new key pair, and sets Testnet as the default environment.

## Essential CLI commands

| Command | Purpose |
|---|---|
| `sui --version` | Verify installation |
| `sui client active-address` | Show the current active address |
| `sui client active-env` | Show the current network |
| `sui client balance` | Check SUI token balance |
| `sui client objects` | List objects owned by the active address |
| `sui client switch --address <ADDRESS>` | Change the active address |
| `sui client new-address ed25519` | Create a new address |
| `sui client publish` | Publish a Move package |
| `sui client upgrade --upgrade-capability <CAP_ID>` | Upgrade a published package |
| `sui client call --package <ID> --module <MOD> --function <FN>` | Call a Move function |
| `sui move build` | Compile a Move package |

## Sui networks

Sui operates four network environments:

- **Mainnet:** Production network. SUI tokens have real monetary value. Use for final deployments.
- **Testnet:** Mirrors Mainnet features. Free SUI tokens from faucets. Use for integration testing and staging.
- **Devnet:** Development network. Free SUI tokens. Use for early-stage development and experimentation.
- **Localnet:** Runs locally on your machine. Use for offline development and unit testing.

## Gas cost model

Every transaction on Sui requires SUI tokens to pay gas. The total gas cost is:

**gas cost = computation cost + storage cost - storage rebate**

- **Computation cost:** Proportional to the computational effort of executing the transaction.
- **Storage cost:** The cost of storing new or expanded objects onchain. You pay for the bytes your objects occupy.
- **Storage rebate:** When a transaction deletes objects or reduces their size, you receive a rebate for the storage freed. This incentivizes cleaning up unused state.

The gas budget (`--gas-budget`) sets the maximum you are willing to pay. If the transaction exceeds the budget, it aborts. On Testnet and Devnet, tokens are free through faucets at `faucet.sui.io`, the Sui Discord channels (`#devnet-faucet`, `#testnet-faucet`), or programmatically through the TypeScript SDK's `requestSuiFromFaucetV2()` function. Gas prices can vary per epoch; query the current gas price through the RPC.

## Epochs

An epoch is a fixed time period during which the validator set and gas price remain constant. On Mainnet, one epoch is approximately 24 hours. At the epoch boundary, the network processes staking rewards, rotates validators, and updates the gas price. Use `ctx.epoch()` to read the current epoch number in Move and `ctx.epoch_timestamp_ms()` for the epoch start time.

## Rules

- Always specify `--gas-budget` when submitting transactions from the CLI.
- Use `sui client switch --env <ENV>` to change networks. Do not edit `client.yaml` manually.
- Use `ed25519` as the key scheme when creating new addresses unless there is a specific reason for another scheme.

## Common mistakes

- **Forgetting to switch networks.** Publishing to Mainnet when you meant Testnet. Always verify with `sui client active-env`.
- **Running out of gas on Testnet/Devnet.** Use the faucet at `faucet.sui.io` or `requestSuiFromFaucetV2()` to get free tokens.
- **Losing the recovery phrase.** Sui displays it only once at address creation. Store it securely.
