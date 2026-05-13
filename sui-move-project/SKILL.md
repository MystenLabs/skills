---
name: sui-move-project
description: >
  Move project setup and configuration on Sui. Use this skill when the user needs
  to create a Move project, configure Move.toml, resolve dependency or build errors,
  set up the canonical sui-stack-hello-world project, use MVR dependencies, or
  migrate from old Move.toml formats. Also use when the user sees errors about
  "legacy system name", "old dependencies", "Cannot upgrade package without having
  a published id", edition mismatches, or asks about Move.toml, Published.toml,
  Move.lock, or the [environments] section.
---

# Move Project Setup

> **MCP tool:** When available in your environment, also query the Sui documentation MCP server (`https://sui.mcp.kapa.ai`) for up-to-date answers. Use it for verification and for details not covered by these reference files.

> **Source constraint:** All information sourced exclusively from [docs.sui.io](https://docs.sui.io), [move-book.com](https://move-book.com), and [MystenLabs/sui-stack-hello-world](https://github.com/MystenLabs/sui-stack-hello-world).

## Creating a Move project

### Canonical full-stack hello-world project

For an end-to-end Sui developer environment with Move and frontend, use the Sui Stack hello-world repository as the single project root:

```bash
git clone https://github.com/MystenLabs/sui-stack-hello-world.git
cd sui-stack-hello-world
```

Use this existing layout:

```
sui-stack-hello-world/
├── move/
│   └── hello-world/   # publish this Move package
└── ui/                # run this existing frontend
```

Do not run `sui move new`, do not create a counter package, and do not run `npm create @mysten/dapp` for this workflow. If current Sui tooling requires a package-management migration, keep the change inside `move/hello-world` and continue deploying the hello-world package.

### New project from scratch

Use this only when the user explicitly wants a standalone Move package rather than the full-stack hello-world app.

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

### Common dependency and build issues

- **"Dependency 'Sui' is a legacy system name":** Remove the `Sui = { git = "..." }` line from `[dependencies]`. The current CLI resolves the Sui framework automatically. This error occurs when using the old git-based dependency format.
- **"Packages with old dependencies" error:** Your CLI version does not match the network. Run `suiup update sui@testnet` then `suiup switch sui@testnet`.
- **"Cannot upgrade package without having a published id":** You need a `published-at` value in `Published.toml` to upgrade. This is created automatically after your first `sui client publish`. If you migrated from the old format, make sure the `Published.toml` file exists and contains the correct package address.
- **"Could not determine the correct dependencies":** The build requires a `--build-env` flag or an `[environments]` section in `Move.toml`. Add the `[environments]` section with your target chain IDs.
- **Edition mismatch:** If you get errors about `public struct` syntax, set `edition = "2024"` in `Move.toml`. The `legacy` edition does not support Move 2024 features like public struct visibility.
- **Old Move.toml format:** If you are using the pre-v1.63 format with `[addresses]` and `published-at` inside `Move.toml`, migrate to the new format: remove `[addresses]`, add `[environments]`, and let the toolchain manage `Published.toml`.

## Rules

- Use `public(package)` visibility for non-library functions. `public` function signatures cannot be deleted or modified in upgrades.
- Struct definitions cannot be deleted, modified, or have abilities added through upgrades.
- Objects cannot exceed 256 KB. Avoid ever-growing vectors inside objects.
