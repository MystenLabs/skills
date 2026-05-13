---
name: walrus-sites
description: >
  Publishing, updating, and serving decentralized websites on Walrus Sites.
  Use when the user needs to deploy a frontend to Walrus Sites, run a local
  portal for testnet, debug site-builder errors, configure ws-resources.json,
  or manage site object lifecycle (update, destroy, extend blobs). Also use
  when the user asks about site-builder, walrus-sites, portal setup, or
  hosting a dApp on Walrus. For blob storage without the Sites framework
  (raw upload/download), see the `accessing-data` skill's walrus.md.
---

# Walrus Sites — Decentralized Website Hosting

> **MCP tool:** When available in your environment, also query the Sui documentation MCP server (`https://sui.mcp.kapa.ai`) for up-to-date answers. Use it for verification and for details not covered by these reference files.

Walrus Sites lets you deploy a static website (HTML/CSS/JS) to Walrus, with an on-chain Sui object tracking the site's resources. A portal server resolves site subdomains, fetches resources from Walrus, and serves them over HTTP. The result is a fully decentralized frontend — no centralized server, CDN, or DNS required.

> **Source constraint:** All information in this skill is sourced from the [MystenLabs/walrus-sites](https://github.com/MystenLabs/walrus-sites) repository and the [Walrus Sites documentation](https://docs.wal.app/walrus-sites/). When extending or updating this skill, only pull from these sources. Do not use third-party blogs or unofficial tutorials.

Common failures:

1. **Blobs expire.** Sites published with too few epochs silently break — the portal returns 404 once the blobs expire. Always use a generous `--epochs` value (30+).
2. **Portal misconfiguration.** The portal's `original_package_id` must match the Walrus Sites framework package (`site::Site`), not your app's Move package. The testnet example config ships with the correct value — don't change it.
3. **Testnet sites can't use `wal.app`.** The public `wal.app` portal only serves mainnet sites. Testnet requires a self-hosted local portal.
4. **SPA routing.** Single-page apps need `ws-resources.json` routes config to handle client-side routing. Without it, direct navigation to `/my-route` returns 404.

---

## Sub-skills

### publishing — Building and deploying sites
**Path:** `publishing/SKILL.md`
**Load when:** deploying a new site, updating an existing site, choosing epoch duration, configuring `ws-resources.json`, or troubleshooting `site-builder` errors.
**Covers:** `site-builder publish`, `site-builder update`, `--epochs` flag, blob expiration, `ws-resources.json` configuration, SPA routing, site naming, `site-builder sitemap` for debugging, `site-builder destroy`.

### portal — Running a local portal for testnet
**Path:** `portal/SKILL.md`
**Load when:** the user needs to view a testnet site, set up the local portal, fix portal 404s, or understand how portal resolution works.
**Covers:** cloning the portal, installing dependencies (Bun), `portal-config.yaml`, the `original_package_id` gotcha, starting the server, URL format, port conflicts, mainnet vs testnet differences.

---

## Routing guide

| Task | Load |
|------|------|
| Deploy a frontend to Walrus Sites | `publishing/` |
| Update an existing deployed site | `publishing/` |
| Fix 404 or expired site | `publishing/` + `portal/` |
| View a testnet site locally | `portal/` |
| Set up the local portal | `portal/` |
| Portal shows "Page not found" | `portal/` + `publishing/` (check blob expiry) |
| Configure SPA routing | `publishing/` |
| Check what resources a site has | `publishing/` (`site-builder sitemap`) |
| Delete a deployed site | `publishing/` |
| Choose between Walrus Sites and traditional hosting | Skill Content below |

---

## Skill Content

### Key concepts

- **Site object.** A Sui object of type `site::Site` (from the Walrus Sites framework package). It holds metadata (name, description) and dynamic fields mapping resource paths to Walrus blob references. Created by `site-builder publish`, owned by the publisher's address.

- **Resources.** Each file in the deployed directory becomes a resource stored on Walrus. Small files may be batched into a single "quilt" blob. Each resource has a path (e.g., `/index.html`, `/assets/main.js`) and optional HTTP headers.

- **Portal.** A server that maps `<base36-site-id>.localhost:3000` URLs to on-chain site objects. It reads the site's dynamic fields to find the requested resource path, fetches the blob from a Walrus aggregator, and returns it as an HTTP response. The portal is framework-level infrastructure, not part of your app.

- **`ws-resources.json`.** A configuration file in the site's root directory that controls resource headers, routing, and site metadata. Auto-generated on first publish with the site object ID. On subsequent runs, the site-builder reads it to determine whether to create a new site or update the existing one.

- **Blob expiration.** Walrus blobs have a finite storage duration measured in epochs. When blobs expire, the portal can no longer fetch them and returns 404. Use `site-builder sitemap <object-id>` to check expiration dates. Re-publish with a higher `--epochs` value to fix.

### Rules

1. **Always use `--epochs 30` or higher for testnet deploys.** Low values (like 5) cause blobs to expire within days. For production mainnet, use even higher values or `--permanent`.
2. **Build before publishing.** Run `npm run build` (or equivalent) to produce a static `dist/` directory. The site-builder publishes whatever directory you point it at.
3. **Don't change `original_package_id` in the portal config** unless you know the Walrus Sites framework package has been upgraded. The testnet example value is correct.
4. **`wal.app` is mainnet only.** For testnet, self-host the portal from the `MystenLabs/walrus-sites` repo.
5. **Check `ws-resources.json` after first publish.** It records the site object ID. Keep it in version control so future publishes update the existing site rather than creating a new one.

### Common mistakes

- **Publishing with `--epochs 5` and wondering why the site is gone a week later.** Blobs expired. Re-publish with `--epochs 30+`.
- **Changing the portal's `original_package_id` to your app's package ID.** The portal needs the Walrus Sites framework package ID (`site::Site`), not your Move contract's package ID. These are completely different things.
- **Trying to visit a testnet site on `wal.app`.** It only serves mainnet. You need a local portal for testnet.
- **Forgetting to build the frontend before publishing.** `site-builder publish dist/` publishes the `dist/` directory contents. If you didn't `npm run build` first, you're publishing source files or stale output.
- **Deploying an SPA without fallback routing.** React/Vue/Svelte SPAs use client-side routing. Direct navigation to `/borrows` hits the portal, which looks for `/borrows` as a resource — and it doesn't exist. Configure a fallback in `ws-resources.json`.
- **Not killing port 3000 before starting the portal.** Vite dev server, Next.js, or other tools often use port 3000. The portal silently fails to bind if the port is taken.
