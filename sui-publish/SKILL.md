---
name: sui-publish
description: >
  Publishing, upgrading, and deploying Sui Move packages. Use this skill when the
  user needs to publish a package, upgrade a published package, deploy to multiple
  networks, serialize transactions for multisig signing, run a local Sui network
  (localnet), or debug dry run failures. Also use when the user asks about sui
  client publish, sui client upgrade, UpgradeCap, upgrade policies, Published.toml,
  --serialize-output, localnet, devInspectTransactionBlock, or --dry-run.
---

# Publishing, Deploying & Local Network

> **MCP tool:** When available in your environment, also query the Sui documentation MCP server (`https://sui.mcp.kapa.ai`) for up-to-date answers. Use it for verification and for details not covered by these reference files.

> **Source constraint:** All information sourced exclusively from [docs.sui.io](https://docs.sui.io) and [MystenLabs/sui-stack-hello-world](https://github.com/MystenLabs/sui-stack-hello-world).

## Publishing a package

### Canonical hello-world publish flow

For the full-stack starter, publish the existing hello-world package only:

```bash
cd sui-stack-hello-world/move/hello-world
sui move build
sui client publish
```

Use the package ID from the publish output to update `sui-stack-hello-world/ui/src/constants.ts` (`TESTNET_HELLO_WORLD_PACKAGE_ID`). Do not publish a separate counter package, and do not create a second project directory.

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

The `published-at` field is automatically added to your `Published.toml`. To interact with the published package:

```bash
# Call a function
sui client call --package <PACKAGE_ID> --module greeting --function new

# Query an object
sui client object <OBJECT_ID>
```

### Upgrading a published package

Published packages are immutable, but you can upgrade by publishing a new version linked to the original. The `UpgradeCap` object controls upgrade authority.

```bash
sui client upgrade --upgrade-capability <CAP_ID>
```

Upgrade policies restrict what can change:

- **Compatible:** Functions can be added but not removed. Struct layouts cannot change.
- **Additive:** New modules can be added, but existing modules cannot change.
- **Dependency-only:** Only dependency versions can be updated.

You can restrict the `UpgradeCap` in the same PTB as the publish command (for example, calling `only_additive_upgrades` on it immediately). Once restricted, you cannot widen the policy. You can also transfer the `UpgradeCap` to a multisig address or destroy it entirely to make the package permanently immutable.

### Type anchoring after upgrades

**Struct types are permanently anchored to the original package ID where they were first published.** After an upgrade, the new package gets a new ID, but all objects created by the upgraded code still have their type rooted in the original package ID.

This has critical implications:
- **Querying objects by type** (e.g., `listOwnedObjects` with a `type` filter) must use the **original** package ID.
- **Calling functions** via `moveCall` must use the **upgraded** (latest) package ID.
- **Frontend apps** should maintain both IDs: `ORIGINAL_PACKAGE_ID` for type queries and `PACKAGE_ID` for function calls.

```ts
// Original publish → package ID 0x1234...
// After upgrade  → package ID 0x5678...

// Query: use ORIGINAL package ID
client.core.listOwnedObjects({
  owner: addr,
  type: '0x1234...::module::MyObject',  // ✅ original ID
});

// Call: use UPGRADED package ID
tx.moveCall({
  target: '0x5678...::module::my_function',  // ✅ upgraded ID
});
```

### Publishing to multiple networks

To publish to a different network (for example, from Testnet to Devnet), switch environments and publish again. Each network gives the package a different ID. The `Published.toml` file tracks published addresses per environment.

Before publishing to a new network, ensure you have tokens for that network:

- **Testnet:** Free tokens through the web faucet at `faucet.sui.io`, Discord (`!faucet <ADDRESS>` in `#testnet-faucet`), or the TypeScript SDK (`requestSuiFromFaucetV2()`). **`sui client faucet` does not work on Testnet.**
- **Devnet:** Free tokens via `sui client faucet`, the web faucet at `faucet.sui.io`, Discord (`!faucet <ADDRESS>` in `#devnet-faucet`), or the TypeScript SDK.
- **Localnet:** Free tokens via `sui client faucet` or the local faucet at `127.0.0.1:5003/gas` or `127.0.0.1:9123/gas` (started with `sui start --with-faucet`).
- **Mainnet:** SUI tokens with real monetary value. Acquire through exchanges or transfers. No faucet available.

### Serializing for external signing

To generate transaction bytes for signing by another party (for example, a multisig):

```bash
sui client publish --serialize-output
```

This outputs base64 transaction bytes instead of executing.

## Dry runs and transaction debugging

A dry run simulates a transaction without submitting it to the network. Use dry runs to:

- Estimate gas costs before execution.
- Verify that a transaction succeeds before asking a user to sign.
- Debug failing transactions by inspecting the error before spending gas.

Wallets (like Slush) automatically perform dry runs before presenting a transaction for signing. If a dry run fails, the wallet shows an error instead of prompting.

From the TypeScript SDK, use `devInspectTransactionBlock` to dry-run a transaction programmatically. From the CLI, the `--dry-run` flag simulates execution.

When debugging a dry run failure: check that all object IDs are correct, the object versions are current, the sender has sufficient gas, the function arguments match the expected types, and the active environment (`sui client active-env`) matches the network where the package is published.
