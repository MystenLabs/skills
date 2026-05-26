---
name: walrus-sites-publishing
description: >
  Publishing, updating, and managing decentralized websites with the Walrus
  Sites site-builder CLI. Use when the user needs to deploy a static frontend
  to Walrus Sites, update an existing deployment, configure ws-resources.json
  for SPA routing or custom headers, check blob expiration with sitemap, extend
  blob storage, or destroy a site. Also use when the user sees site-builder
  errors or asks about --epochs, blob expiry, or site lifecycle.
  For running a local portal to view testnet sites, see the `walrus-sites/portal` skill.
---

# Publishing and Managing Walrus Sites

> **MCP tool:** When available in your environment, also query the Sui documentation MCP server (`https://sui.mcp.kapa.ai`) for up-to-date answers. Use it for verification and for details not covered by these reference files.

> **Source constraint:** All information sourced from [MystenLabs/walrus-sites](https://github.com/MystenLabs/walrus-sites) and [docs.wal.app/walrus-sites](https://docs.wal.app/walrus-sites/). Do not use third-party blogs or unofficial tutorials.

## Prerequisites

1. **Sui CLI** installed and configured for the target network (`sui client active-env`).
2. **`site-builder`** installed via `suiup install site-builder`.
3. **`walrus`** CLI installed via `suiup install walrus`, with a config context for the target network.
4. **SUI tokens** for gas on the target network (`sui client balance`).
5. **WAL tokens** for Walrus blob storage (testnet: faucet available).
6. A **built static site** — run `npm run build` (or equivalent) to produce a `dist/` directory.

Check the site-builder config exists:

```bash
cat ~/.config/walrus/sites-config.yaml
```

This file specifies the Walrus Sites framework package, staking object, and Walrus context per network. It's created automatically by `suiup install site-builder`.

## Publishing a new site

```bash
site-builder publish --epochs 30 dist/
```

- `--epochs 30` — store blobs for 30 Walrus epochs. Use higher values for longer-lived sites. Use `--permanent` for sites that should never expire (cannot be reclaimed).
- `dist/` — the directory containing your built static site.

Output includes:
- **Site Object ID** — the on-chain Sui object representing your site.
- **Base36 subdomain** — used to construct the portal URL.
- **`ws-resources.json`** — auto-generated in the source directory with the site object ID.

Example output:
```
New site object ID: 0x95926fb4cd28705823af105900d704d1c56c17d55d994a0715479c175590f80a
For local development: http://3q7dwaf5a6eg....localhost:3000
```

### Choosing `--epochs`

| Use case | Recommended |
|----------|-------------|
| Quick testnet demo | `--epochs 30` |
| Testnet staging | `--epochs 100` |
| Mainnet production | `--epochs 200+` or `--permanent` |
| Throwaway test | `--epochs 10` (minimum practical) |

**Do not use `--epochs 5` or lower.** Blobs expire quickly and the site silently breaks with a 404.

Other duration options:
- `--earliest-expiry-time "2026-12-31T00:00:00Z"` — expire no earlier than a specific date.
- `--end-epoch 200` — expire at a specific Walrus epoch number.

## Updating an existing site

After the first publish, `ws-resources.json` records the site object ID. Subsequent publishes detect this and offer to update:

```bash
# Rebuild, then update
npm run build
site-builder update --epochs 30 dist/
```

`site-builder update` replaces changed resources, adds new ones, and removes deleted ones. Unchanged resources are not re-uploaded.

To add or update specific resources without replacing the whole site:

```bash
site-builder update-resources --epochs 30 dist/new-file.html
```

## `ws-resources.json`

Auto-generated in the site directory on first publish. Example:

```json
{
  "site_name": "My Walrus Site",
  "object_id": "0x95926fb4cd28705823af105900d704d1c56c17d55d994a0715479c175590f80a"
}
```

**Keep this file in version control.** The site-builder reads it to determine whether to create a new site or update the existing one. Without it, every publish creates a new site object.

### SPA routing configuration

Single-page apps need all routes to serve `index.html`. Add a `routes` section to `ws-resources.json`:

```json
{
  "site_name": "My Library",
  "object_id": "0x...",
  "routes": {
    "/*": "/index.html"
  }
}
```

Without this, direct navigation to `/borrows` or any client-side route returns 404 from the portal.

### Custom headers

```json
{
  "site_name": "My App",
  "object_id": "0x...",
  "headers": {
    "/assets/*": {
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  }
}
```

## Debugging with `site-builder sitemap`

```bash
site-builder sitemap 0x<site-object-id>
```

Shows all published resources with their blob IDs and **expiration dates**:

```
 Resource path               Blob / Quilt Patch ID   Earliest Expiration Date
 /index.html                 MlhytW8o...             2026-06-15
 /assets/index-B9aUffXC.css  MlhytW8o...             2026-06-15
 /assets/index-Do4WTf-k.js   MlhytW8o...             2026-06-15
```

**If the expiration date is in the past, the site will 404.** Re-publish with a higher `--epochs` value.

## Destroying a site

```bash
site-builder destroy 0x<site-object-id>
```

Removes the site object from Sui. Blob storage may still persist until expiry but the site will no longer be resolvable.

## Extending blob storage

If blobs are approaching expiry, extend them during an update:

```bash
site-builder update --epochs 50 dist/
```

The `update` command extends blob storage to the new epoch count if it's longer than the current duration.

## Portal access: mainnet vs testnet

The public portal at `wal.app` only serves **mainnet** sites. If you are deploying to testnet, you must run a self-hosted local portal to view your site. See the `walrus-sites/portal` skill for setup instructions.

## End-to-end publish workflow

```bash
# 1. Build the frontend
cd my-app/ui
npm run build

# 2. First-time publish (creates site object + ws-resources.json)
site-builder publish --epochs 30 dist/

# 3. Note the site object ID and portal URL from the output

# 4. For testnet: start the local portal (see walrus-sites/portal skill)

# 5. To update after code changes:
npm run build
site-builder update --epochs 30 dist/
```

## Rules

1. **Always build before publishing.** `site-builder publish dist/` publishes whatever is in `dist/`. If you didn't `npm run build` first, you're publishing stale or source files.
2. **Use `--epochs 30` or higher for testnet.** Low values cause silent 404s within days.
3. **Keep `ws-resources.json` in version control.** Without it, every publish creates a new site instead of updating.
4. **Use `update` for subsequent deploys, not `publish`.** `publish` creates a new site object with a new URL. `update` modifies the existing one in place.

## Common mistakes

- **Publishing with `--epochs 5` and wondering why the site breaks.** Blobs expired. Re-publish with `--epochs 30+`.
- **Forgetting to build the frontend before publishing.** Publishing the `src/` directory instead of `dist/`.
- **Running `publish` again instead of `update` and getting a new URL.** The old site still exists but the new one has a different object ID and base36 subdomain.
- **Deploying an SPA without fallback routing.** Direct navigation to `/dashboard` returns 404. Add `"routes": { "/*": "/index.html" }` to `ws-resources.json`.
- **Deleting `ws-resources.json` from the build directory.** The site-builder can't find the existing site and creates a new one.
