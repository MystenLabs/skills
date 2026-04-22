---
name: sui-dev-environment
description: >
  Complete guide for setting up a Sui developer environment from scratch. Use this
  skill whenever the user needs to install Sui, configure the CLI, set up a Move
  project, choose an IDE or editor, run tests, get faucet tokens, publish a package,
  set up a frontend with dApp Kit, or troubleshoot version and dependency issues.
  Also use when the user asks about suiup, Move.toml, sui client configuration,
  Localnet setup, Move Analyzer, the TypeScript SDK, wallet setup, or any
  getting-started workflow on Sui. This skill covers the full path from zero to a
  deployed package with a connected frontend.
---

# Sui Developer Environment Setup

> **Source constraint:** All information in this skill is sourced exclusively from [docs.sui.io](https://docs.sui.io) and [move-book.com](https://move-book.com). When extending or updating this skill, only pull from these two sources. Do not use third-party blogs, tutorials, or unofficial documentation.

This skill walks through the complete developer setup: installing the toolchain, configuring the CLI, creating a Move project, writing and testing code, publishing to a network, and connecting a frontend.

## System requirements

Sui supports:

- **Linux:** Ubuntu 22.04 (Jammy Jellyfish) or newer
- **macOS:** Monterey or newer
- **Windows:** Windows 10 or 11

## Installing Sui

### suiup (recommended)

`suiup` is the official installer and version manager for the Sui toolchain. It supports installing and switching between different versions of the Sui CLI and other Sui Stack components (Walrus, MVR).

```bash
curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/install.sh | sh
```

After installing suiup, install the Sui CLI targeting a specific network:

```bash
suiup install sui@testnet    # install the Testnet-compatible version
suiup install sui@mainnet    # install the Mainnet-compatible version
```

Update to the latest version:

```bash
suiup update sui@testnet
```

**Important:** `suiup update` downloads the new version but does not automatically make it the active default. After updating, you must switch to the new version:

```bash
suiup switch sui@testnet     # set the latest installed testnet version as default
```

To verify which versions are installed and which is active:

```bash
suiup show                   # list all installed binaries and their default status
```

### suiup command reference

| Command | Syntax | What it does |
|---|---|---|
| `install` | `suiup install sui@testnet` | Download and install a binary for a network |
| `update` | `suiup update sui@testnet` | Download the latest version (does NOT switch to it) |
| `switch` | `suiup switch sui@testnet` | Set the latest installed version for a network as the active default |
| `show` | `suiup show` | List all installed binaries with versions and defaults |
| `self update` | `suiup self update` | Update suiup itself |

The `switch` command takes a `binary@network` argument (for example, `sui@testnet`, `walrus@testnet`, `move-analyzer@testnet`). It does not accept separate positional arguments like `suiup switch sui testnet v1.70.2`.

### Alternative methods

- **Homebrew (macOS/Linux):** `brew install sui`
- **Chocolatey (Windows):** `choco install sui`

These alternatives do not support installing additional Sui Stack components like Walrus or MVR and might take several minutes if prerequisites are not already installed.

### Verify installation

```bash
sui --version
```

If the command returns "sui not found", the installation did not succeed or the binary is not on your PATH.

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

## Creating a Move project

### New project from scratch

```bash
sui move new my_project
cd my_project
```

This creates:

```
my_project/
├── sources/       # .move source files go here
├── tests/         # test files
└── Move.toml      # package manifest
```

### Move.toml (current format)

Since Sui CLI v1.63+, the Sui framework dependency is resolved automatically. You do not need to specify it in `[dependencies]`. A minimal `Move.toml` is:

```toml
[package]
name = "my_project"
edition = "2024"

[dependencies]
# Sui framework is automatically resolved — do not add it here.
# Add only third-party or local dependencies.
```

The old `Sui = { git = "...", rev = "framework/testnet" }` format is a legacy system name and errors out on current CLI versions with: `Dependency 'Sui' is a legacy system name and cannot be used.`

The old `[addresses]` section with `my_project = "0x0"` is also no longer needed. If you need to target multiple networks, add an `[environments]` section:

```toml
[environments]
testnet = "4c78adac"
mainnet = "35834a8a"
```

### Published.toml and Move.lock

After publishing, the toolchain creates or updates:

- **`Published.toml`:** Tracks your published package addresses per environment. Contains `published-at` and `upgrade-capability-id` values for each network.
- **`Move.lock`:** Locks resolved dependency versions. Commit this to version control.

To publish to a different environment (for example, after publishing to Testnet, now deploying to Devnet), switch environments and publish again. Each network gives the package a separate ID. The `Published.toml` tracks both.

### Using MVR dependencies

The Move Registry (MVR) is an onchain package manager for Sui. Install it with:

```bash
suiup install mvr
```

You can use MVR package names in `Move.toml` dependencies instead of git URLs. This provides versioned, auditable dependencies resolved through the onchain registry.

### Using the starter project

For a full-stack project with both Move and frontend:

```bash
git clone https://github.com/MystenLabs/sui-stack-hello-world.git
cd sui-stack-hello-world/move/hello-world
```

For frontend scaffolding:

```bash
npm create @mysten/dapp
```

### Common dependency and build issues

- **"Dependency 'Sui' is a legacy system name":** Remove the `Sui = { git = "..." }` line from `[dependencies]`. The current CLI resolves the Sui framework automatically. This error occurs when using the old git-based dependency format.
- **"Packages with old dependencies" error:** Your CLI version does not match the network. Run `suiup update sui@testnet` then `suiup switch sui@testnet`.
- **"Cannot upgrade package without having a published id":** You need a `published-at` value in `Published.toml` to upgrade. This is created automatically after your first `sui client publish`. If you migrated from the old format, make sure the `Published.toml` file exists and contains the correct package address.
- **"Could not determine the correct dependencies":** The build requires a `--build-env` flag or an `[environments]` section in `Move.toml`. Add the `[environments]` section with your target chain IDs.
- **Edition mismatch:** If you get errors about `public struct` syntax, set `edition = "2024"` in `Move.toml`. The `legacy` edition does not support Move 2024 features like public struct visibility.
- **Old Move.toml format:** If you are using the pre-v1.63 format with `[addresses]` and `published-at` inside `Move.toml`, migrate to the new format: remove `[addresses]`, add `[environments]`, and let the toolchain manage `Published.toml`.

## IDE and editor setup

### VS Code with Move Analyzer (recommended)

Move Analyzer is the official Language Server providing code completion, go-to-definition, diagnostics, and hover documentation.

```bash
suiup install move-analyzer
```

Then install the "Move Analyzer" extension in VS Code. It activates automatically for `.move` files.

### Code formatting

```bash
npm i -D prettier @mysten/prettier-plugin-move
```

Add to your Prettier config to format Move files on save.

### Other editors

Community plugins exist for IntelliJ (Sui Move Language Plugin), Emacs (move-mode), Vim (Move.vim), and Zed (Move extension). Web-based options include Play Move (official) and BitsLab IDE (community).

## Building and testing

### Build

```bash
sui move build
```

This compiles all modules, validates types, enforces resource safety, and produces bytecode. Fix any errors before proceeding.

### Testing

Write tests in the `tests/` directory or inline with `#[test]` attributes:

```move
#[test]
fun test_create_sword() {
    let mut ctx = tx_context::dummy();
    let sword = forge_sword(&mut ctx);
    assert!(sword.damage == 100);
    // Clean up: transfer or destroy the object
    transfer::public_transfer(sword, @0x0);
}
```

Run tests:

```bash
sui move test                             # run all tests
sui move test --filter test_create        # run tests matching a pattern
sui move test --coverage                  # run with coverage tracking
sui move coverage source --module my_mod  # view coverage for a module
```

### Key test modules

| Module | Purpose |
|---|---|
| `sui::test_scenario` | Multi-transaction, multi-sender test scenarios |
| `std::unit_test` | Assertion macros |
| `sui::test_utils` | Cleanup utilities (`destroy` for test objects) |
| `std::debug` | Debug printing (`debug::print`) |

Aim for 100% code coverage.

### Debugging

- **Move Trace Debugger:** Step-through debugger for Move execution traces with variable inspection.
- **`sui replay`:** Locally re-execute any past onchain transaction and compare effects. Useful for diagnosing production issues.
- **`std::debug::print`:** Print values during test execution.

## Publishing a package

### Pre-publish checklist

1. Verify your active environment: `sui client active-env`
2. Verify you have SUI tokens: `sui client balance`
3. Build successfully: `sui move build`

### Publish

```bash
sui client publish
```

This deploys the package to the active network and returns:

- A unique **package ID** (use this for all future interactions)
- An **UpgradeCap** object (sent to your address, controls future upgrades)
- Object IDs for anything created during `init` functions

### After publishing

The `published-at` field is automatically added to your `Move.toml`. To interact with the published package:

```bash
# Call a function
sui client call --package <PACKAGE_ID> --module greeting --function new

# Query an object
sui client object <OBJECT_ID>
```

### Publishing to multiple networks

To publish to a different network (for example, from Testnet to Devnet), switch environments and publish again. Each network gives the package a different ID. The `Published.toml` file tracks published addresses per environment.

### Serializing for external signing

To generate transaction bytes for signing by another party (for example, a multisig):

```bash
sui client publish --serialize-output
```

This outputs base64 transaction bytes instead of executing.

## Setting up a frontend

### Prerequisites

- Node.js and `pnpm` package manager
- A published Move package on Testnet
- A browser wallet (Slush Wallet recommended)

### Scaffold a new app

```bash
npm create @mysten/dapp
```

Or manually set up with:

```bash
pnpm add @mysten/dapp-kit @mysten/sui @tanstack/react-query
```

### Key packages

| Package | Purpose |
|---|---|
| `@mysten/dapp-kit` | React components and hooks for wallet connection, transaction signing, and object queries |
| `@mysten/sui` | Core TypeScript SDK for network interaction, transaction construction, and BCS encoding |
| `@tanstack/react-query` | Data fetching and caching (required peer dependency for dApp Kit) |

### Configuration and usage

1. Store your package ID in a `constants.ts` file.
2. Set up network config using the SDK's `getFullnodeUrl` function.
3. Use `<ConnectButton />` from dApp Kit for wallet connection.
4. Use the `useSignAndExecuteTransaction` hook to construct PTBs and sign through the wallet.
5. Run `pnpm dev` to start the dev server at `http://localhost:5173/`.

Wallet addresses are separate from CLI-created addresses. Users might need to transfer tokens between their CLI address and wallet address.

## Running a local network

Localnet runs a full Sui network on your machine for offline development.

```bash
sui start --with-faucet --force-regenesis
```

This starts a local validator, faucet, and fullnode. The local faucet is available at `127.0.0.1:5003/gas` or `127.0.0.1:9123/gas`.

Switch to localnet:

```bash
sui client switch --env localnet
```

Localnet resets on restart (with `--force-regenesis`). Use it for rapid iteration and unit testing without depending on external networks.

## Version management

### Keeping Sui up to date

```bash
suiup update sui@testnet     # update to latest Testnet version
suiup update sui@mainnet     # update to latest Mainnet version
```

### Version mismatches

The CLI version must match the network you are targeting. Common symptoms of a mismatch:

- Build errors mentioning "old dependencies"
- Transaction failures on publish
- Unexpected behavior after network upgrades

Check your version against the network:

```bash
sui --version                 # your installed version
sui client active-env         # which network you are targeting
```

If the version is out of date, update and switch:

```bash
suiup update sui@testnet      # download the latest version
suiup switch sui@testnet      # make it the active default
sui --version                  # confirm the new version
```

The `client/server api version mismatch` warning in CLI output means your local CLI is older than the network. Update and switch to fix it.

### Installing additional tools

```bash
suiup install move-analyzer   # Move Language Server
suiup install mvr             # Move Registry CLI (onchain package manager)
suiup install walrus          # Walrus CLI for decentralized storage
suiup install site-builder    # Walrus site builder
```

After installing, switch each tool to make it the active default:

```bash
suiup switch move-analyzer@testnet
suiup switch walrus@testnet
```

## Explorers and data tools

Use SuiVision (`suivision.xyz`) or Suiscan (`suiscan.xyz`) to inspect transactions, objects, addresses, and token balances. Sui provides a GraphQL RPC for rich data queries per network. Use `sui replay` (CLI built-in) to locally re-execute past transactions for debugging.

## Dry runs and transaction debugging

A dry run simulates a transaction without submitting it to the network. Use dry runs to:

- Estimate gas costs before execution.
- Verify that a transaction succeeds before asking a user to sign.
- Debug failing transactions by inspecting the error before spending gas.

Wallets (like Slush) automatically perform dry runs before presenting a transaction for signing. If a dry run fails, the wallet shows an error instead of prompting.

From the TypeScript SDK, use `devInspectTransactionBlock` to dry-run a transaction programmatically. From the CLI, the `--dry-run` flag simulates execution.

When debugging a dry run failure: check that all object IDs are correct, the object versions are current, the sender has sufficient gas, and the function arguments match the expected types.

## Best practices from the cheat sheet

- Never sign two concurrent transactions that touch the same owned object. This causes equivocation and locks the object until epoch end.
- Use `vector`-backed collections (VecMap, VecSet) only for known maximum sizes of 1,000 items or fewer. Use Table, Bag, or other dynamic-field-backed collections for larger or unbounded data.
- Objects cannot exceed 256 KB. Avoid ever-growing vectors inside objects.
- Use `public(package)` visibility for non-library functions. `public` function signatures cannot be deleted or modified in upgrades.
- Struct definitions cannot be deleted, modified, or have abilities added through upgrades.
- Let wallets manage gas budget, gas price, and coin selection. Wallets perform dry runs to prevent failures. Do not hardcode gas budgets in your frontend; let the wallet estimate through dry runs.
- Gas coin selection: the wallet automatically picks which SUI coin objects to use for gas. If a user has many small coin objects, the wallet merges them. If your frontend constructs transactions manually, use `tx.setGasBudget()` only when needed; otherwise let the SDK and wallet handle it.
- Submit writes and reads to the same fullnode for consistency.
- Prefer programmable transaction blocks over new smart contract code for composition and batching.
