# Publishing, Deploying & Local Network

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

### Publishing to multiple networks

To publish to a different network (for example, from Testnet to Devnet), switch environments and publish again. Each network gives the package a different ID. The `Published.toml` file tracks published addresses per environment.

### Serializing for external signing

To generate transaction bytes for signing by another party (for example, a multisig):

```bash
sui client publish --serialize-output
```

This outputs base64 transaction bytes instead of executing.

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

## Dry runs and transaction debugging

A dry run simulates a transaction without submitting it to the network. Use dry runs to:

- Estimate gas costs before execution.
- Verify that a transaction succeeds before asking a user to sign.
- Debug failing transactions by inspecting the error before spending gas.

Wallets (like Slush) automatically perform dry runs before presenting a transaction for signing. If a dry run fails, the wallet shows an error instead of prompting.

From the TypeScript SDK, use `devInspectTransactionBlock` to dry-run a transaction programmatically. From the CLI, the `--dry-run` flag simulates execution.

When debugging a dry run failure: check that all object IDs are correct, the object versions are current, the sender has sufficient gas, the function arguments match the expected types, and the active environment (`sui client active-env`) matches the network where the package is published.
