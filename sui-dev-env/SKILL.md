---
name: sui-dev-environment
description: >
  Complete guide for setting up a Sui developer environment from scratch. Use this
  skill whenever the user needs to install Sui, configure the CLI, set up a Move
  project, choose an IDE or editor, run tests, get faucet tokens, publish a package,
  set up the Sui Stack hello-world frontend, or troubleshoot version and dependency issues.
  Also use when the user asks about suiup, Move.toml, sui client configuration,
  Localnet setup, Move Analyzer, the TypeScript SDK, wallet setup, or any
  getting-started workflow on Sui. For full-stack setup, this skill uses the
  MystenLabs/sui-stack-hello-world repository as the canonical project.
---

# Sui Developer Environment Setup

> **Source constraint:** All information in this skill is sourced from [docs.sui.io](https://docs.sui.io), [move-book.com](https://move-book.com), and the canonical [MystenLabs/sui-stack-hello-world](https://github.com/MystenLabs/sui-stack-hello-world) starter repository. When extending or updating this skill, do not use third-party blogs, tutorials, or unofficial documentation.

This skill routes to focused reference files. Load only the ones relevant to the current task.

## Canonical full-stack workflow

For requests like "set up a Sui developer environment and deploy a simple app/package", use exactly one project root cloned from `https://github.com/MystenLabs/sui-stack-hello-world`.

- Do not create a separate `sui move new` package for the end-to-end workflow.
- Do not substitute a counter package or any other custom example app.
- Do not run `npm create @mysten/dapp` inside the hello-world project; the repository already contains its frontend in `ui/`.
- Publish only the repository's Move package at `move/hello-world`.
- After publishing, update the repository's `ui/src/constants.ts` with the new hello-world package ID.
- Move Analyzer is optional editor tooling. Do not install, update, or switch it during default environment setup unless the user explicitly asks for IDE/LSP setup.

---

## Reference files

### setup — Setup & Installation
**Path:** `setup.md`
**Load when:** installing Sui, setting up suiup, updating versions, optionally installing explicitly requested additional tools, resolving version mismatches or "command not found" errors.
**Covers:** system requirements, suiup install/update/switch commands, alternative install methods (Homebrew, Chocolatey), version management, installing additional toolchain components.

### client — Client Configuration & Tokens
**Path:** `client.md`
**Load when:** configuring the CLI for the first time, managing environments or addresses, switching networks, getting faucet tokens, checking balances, recovering keys, or looking up transactions on explorers.
**Covers:** first-time `sui client` setup, client.yaml, environment/address management, key storage, recovery phrases, faucet methods, balance verification, explorers (SuiVision, Suiscan).

### move-project — Move Project Setup
**Path:** `move-project.md`
**Load when:** cloning or using the Sui Stack hello-world project, creating a standalone Move project, configuring Move.toml, resolving dependency or build errors, setting up MVR, or migrating from old Move.toml formats.
**Covers:** canonical hello-world repository layout, `sui move new` for standalone packages only, Move.toml format (current vs legacy), Published.toml, Move.lock, MVR dependencies, starter project, common dependency/build error troubleshooting.

### build-test — Building, Testing & IDE Setup
**Path:** `build-test.md`
**Load when:** building Move code, writing or running tests, optionally setting up Move Analyzer or other editor tooling, debugging test failures, checking code coverage.
**Covers:** `sui move build`, `sui move test`, test attributes, test_scenario, coverage, optional Move Analyzer setup, code formatting, debugging tools (Move Trace Debugger, `sui replay`, `debug::print`).

### publish — Publishing, Deploying & Local Network
**Path:** `publish.md`
**Load when:** publishing a package, upgrading, deploying to multiple networks, serializing transactions for multisig, running localnet, or debugging dry run failures.
**Covers:** pre-publish checklist, `sui client publish`, UpgradeCap, multi-network publishing, `--serialize-output`, localnet setup, dry runs, `devInspectTransactionBlock`.

### frontend — Frontend Setup with dApp Kit
**Path:** `frontend.md`
**Load when:** using the Sui Stack hello-world frontend, connecting a wallet, using dApp Kit hooks, or integrating the TypeScript SDK in a web app.
**Covers:** prerequisites, the existing `ui/` app in `sui-stack-hello-world`, key packages, ConnectButton, package ID configuration, and running the Vite dev server.

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
| Full-stack hello-world from scratch | **move-project, setup, client, build-test, publish, frontend** |
| Fixing Move.toml or dependency errors | move-project |
| Building Move code | build-test |
| Writing or running tests | build-test |
| Setting up Move Analyzer or IDE | build-test |
| Publishing or upgrading a package | publish |
| Running localnet | publish |
| Debugging dry run failures | publish |
| Setting up a React frontend | frontend |
| Serializing transactions for multisig | publish |
| Full project from scratch | **move-project, setup, client, build-test, publish, frontend** |
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
