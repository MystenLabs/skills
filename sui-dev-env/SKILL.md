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

This skill routes to focused reference files. Load only the ones relevant to the current task.

---

## Reference files

### setup — Setup & Installation
**Path:** `setup.md`
**Load when:** installing Sui, setting up suiup, updating versions, installing additional tools (move-analyzer, mvr, walrus), resolving version mismatches or "command not found" errors.
**Covers:** system requirements, suiup install/update/switch commands, alternative install methods (Homebrew, Chocolatey), version management, installing additional toolchain components.

### client — Client Configuration & Tokens
**Path:** `client.md`
**Load when:** configuring the CLI for the first time, managing environments or addresses, switching networks, getting faucet tokens, checking balances, recovering keys, or looking up transactions on explorers.
**Covers:** first-time `sui client` setup, client.yaml, environment/address management, key storage, recovery phrases, faucet methods, balance verification, explorers (SuiVision, Suiscan).

### move-project — Move Project Setup
**Path:** `move-project.md`
**Load when:** creating a new Move project, configuring Move.toml, resolving dependency or build errors, setting up MVR, or migrating from old Move.toml formats.
**Covers:** `sui move new`, Move.toml format (current vs legacy), Published.toml, Move.lock, MVR dependencies, starter project, common dependency/build error troubleshooting.

### build-test — Building, Testing & IDE Setup
**Path:** `build-test.md`
**Load when:** building Move code, writing or running tests, setting up Move Analyzer or other editor tooling, debugging test failures, checking code coverage.
**Covers:** `sui move build`, `sui move test`, test attributes, test_scenario, coverage, Move Analyzer setup, code formatting, debugging tools (Move Trace Debugger, `sui replay`, `debug::print`).

### publish — Publishing, Deploying & Local Network
**Path:** `publish.md`
**Load when:** publishing a package, upgrading, deploying to multiple networks, serializing transactions for multisig, running localnet, or debugging dry run failures.
**Covers:** pre-publish checklist, `sui client publish`, UpgradeCap, multi-network publishing, `--serialize-output`, localnet setup, dry runs, `devInspectTransactionBlock`.

### frontend — Frontend Setup with dApp Kit
**Path:** `frontend.md`
**Load when:** setting up a React frontend, connecting a wallet, using dApp Kit hooks, or integrating the TypeScript SDK in a web app.
**Covers:** prerequisites, `npm create @mysten/dapp`, key packages (@mysten/dapp-kit, @mysten/sui, @tanstack/react-query), ConnectButton, useSignAndExecuteTransaction.

---

## Routing guide

| Task | Load |
|------|------|
| Installing Sui or suiup | setup |
| Updating or switching Sui versions | setup |
| First-time CLI configuration | client |
| Getting faucet tokens | client |
| Managing wallets, keys, or addresses | client |
| Creating a new Move project | move-project |
| Fixing Move.toml or dependency errors | move-project |
| Building Move code | build-test |
| Writing or running tests | build-test |
| Setting up Move Analyzer or IDE | build-test |
| Publishing or upgrading a package | publish |
| Running localnet | publish |
| Debugging dry run failures | publish |
| Setting up a React frontend | frontend |
| Serializing transactions for multisig | publish |
| Full project from scratch | **all reference files** |
| Code review | **all reference files** |

---

## Always-loaded rules

These critical constraints apply across all tasks:

- Never sign two concurrent transactions that touch the same owned object. This causes equivocation and locks the object until epoch end.
- Use `vector`-backed collections (VecMap, VecSet) only for known maximum sizes of 1,000 items or fewer. Use Table, Bag, or other dynamic-field-backed collections for larger or unbounded data.
- Objects cannot exceed 256 KB. Avoid ever-growing vectors inside objects.
- Use `public(package)` visibility for non-library functions. `public` function signatures cannot be deleted or modified in upgrades.
- Struct definitions cannot be deleted, modified, or have abilities added through upgrades.
- Let wallets manage gas budget, gas price, and coin selection. Do not hardcode gas budgets in frontends.
- Submit writes and reads to the same fullnode for consistency.
- Prefer programmable transaction blocks over new smart contract code for composition and batching.
