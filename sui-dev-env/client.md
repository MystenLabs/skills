# Client Configuration & Tokens

> **Source constraint:** All information sourced exclusively from [docs.sui.io](https://docs.sui.io).

## Configuring the Sui client

### First-time setup

Running `sui client` for the first time prompts you to create a configuration file. Accept the default (press Enter or type `Y`). You can skip the prompt with `sui client -y`.

This generates:

- A new key pair and address
- A 12-word recovery phrase (displayed once, never stored — save it immediately)
- A `client.yaml` configuration file

### Configuration file

Sui stores its configuration at:

- **macOS/Linux:** `~/.sui/sui_config/client.yaml`
- **Windows:** `%USERPROFILE%\.sui\sui_config\client.yaml`

The file contains:

- Network environment connections (Mainnet, Testnet, Devnet, Localnet)
- The active environment (default: Testnet)
- The active address
- The keystore file path

### Managing environments and addresses

| Command | Purpose |
|---|---|
| `sui client active-env` | Show the current network |
| `sui client active-address` | Show the current address |
| `sui client envs` | List all configured environments |
| `sui client switch --env devnet` | Switch to a different network |
| `sui client switch --address <ADDRESS>` | Switch to a different address |
| `sui client new-address ed25519` | Create a new address |
| `sui client addresses` | List all local addresses with aliases |
| `sui client balance` | Check SUI token balance |
| `sui client gas` | List gas coin objects |

### Key storage

Private keys are stored in a separate file:

- **macOS/Linux:** `~/.sui/sui_config/sui.keystore`
- **Windows:** `%USERPROFILE%\.sui\sui_config\sui.keystore`

This file contains Base64-encoded private keys. It is not the same as your machine's system keystore.

### Recovery

To recover an address from a recovery phrase:

```bash
sui keytool import '<12-WORD-PHRASE>' ed25519
```

The entire phrase must be in single quotes and in the correct order.

## Getting SUI tokens

Development on Testnet and Devnet requires SUI tokens for gas. Tokens on these networks are free and hold no monetary value.

### Faucet methods

| Method | How |
|---|---|
| Web faucet | Visit `faucet.sui.io`, enter your address, select network, click Request SUI |
| Discord | Join the Sui Discord, use `!faucet <ADDRESS>` in `#devnet-faucet` or `#testnet-faucet` |
| Community faucets | N1Stake faucet, SuiLearn faucet (separate rate limits) |

Faucets are rate-limited. If you hit a limit, wait or try a different faucet.

### Verify balance

```bash
sui client balance
```

Or use explorers: SuiVision (`suivision.xyz`) or Suiscan (`suiscan.xyz`).

## Explorers and data tools

Use SuiVision (`suivision.xyz`) or Suiscan (`suiscan.xyz`) to inspect transactions, objects, addresses, and token balances. Sui provides a GraphQL RPC for rich data queries per network. Use `sui replay` (CLI built-in) to locally re-execute past transactions for debugging.
