---
name: zklogin-enoki
description: >
  Passwordless (Web2-style) authentication and gasless transactions for Sui apps
  using zkLogin and Enoki. Use this skill whenever the user wants social login
  (Google / Facebook / Twitch / Apple sign-in) that produces a self-custodial Sui
  address, wants users to onboard without a wallet extension or seed phrase, wants
  to sponsor gas so users transact without holding SUI ("gasless", "sponsored
  transactions", "gas station"), is integrating `@mysten/enoki`, registering Enoki
  wallets into dApp Kit (`registerEnokiWallets`), building a backend sponsor with
  `EnokiClient`, or implementing zkLogin manually (ephemeral key, nonce, JWT, ZK
  proof, user salt, address derivation). Also use when choosing between Enoki and
  a manual zkLogin integration, or debugging OAuth redirect / allowed-origin /
  network-mismatch / salt-management issues.
---

# Sui zkLogin + Enoki

> **MCP tool:** When available in your environment, also query the Sui documentation MCP server (`https://sui.mcp.kapa.ai`) for up-to-date answers. Use it for verification and for details not covered by these reference files.

> **Source constraint:** All information in this skill is sourced exclusively from official Mysten Labs documentation: [docs.enoki.mystenlabs.com](https://docs.enoki.mystenlabs.com), [docs.sui.io](https://docs.sui.io), and the [MystenLabs/ts-sdks](https://github.com/MystenLabs/ts-sdks) source. When extending or updating this skill, only pull from these sources. Do not use third-party blogs, tutorials, or unofficial documentation, and do not extrapolate API surface from other SDKs.

zkLogin lets a user authenticate with a normal OAuth provider (Google, Facebook, Twitch, Apple, …) and control a **self-custodial Sui address** — no seed phrase, no browser extension, and the OAuth identity is never publicly linked to the on-chain address. Enoki is Mysten Labs' managed service on top of zkLogin: it runs the ZK prover, manages the user salt, and provides **sponsored (gasless) transactions** so users never need SUI for gas.

This skill prevents the most common AI-coding mistakes in this area:

1. **Teaching a deprecated Enoki API.** The current flow registers Enoki accounts as standard wallets into **dApp Kit** via `registerEnokiWallets()` and drives everything through normal dApp Kit hooks. The older `EnokiFlow` / `useEnokiFlow` / `useZkLogin` / `EnokiFlowProvider` surface no longer appears in current docs — do not generate it.
2. **Leaking the private Enoki API key into the frontend.** The frontend uses the **public** key; the **private/secret** key is backend-only (it can authorize sponsorship).
3. **Hand-rolling zkLogin salt management when Enoki would do it.** Manual salt management is the single biggest footgun — lost salts permanently lock users out of their addresses. Enoki removes this entirely.
4. **Confusing "signed through Enoki" with "sponsored".** Signing via an Enoki wallet does not by itself pay gas; sponsorship is a separate flow with its own allowlist.

This skill routes to focused reference files. Load only the ones relevant to the current task.

---

## Reference files

### concepts — How zkLogin Works
**Path:** `concepts.md`
**Load when:** explaining what zkLogin is, how a Sui address is derived from an OAuth login, the roles of the ephemeral key pair, nonce, JWT, ZK proof, user salt, and `maxEpoch` session expiry, what Enoki manages vs what the protocol requires, or which OAuth providers are supported.
**Covers:** the zkLogin trust model, the flow elements (provider, ephemeral key, nonce, JWT, ZK proof, salt, address derivation), address-derivation inputs, session expiry, supported providers per network, and what Enoki abstracts away.

### frontend-auth — Social Login with Enoki + dApp Kit
**Path:** `frontend-auth.md`
**Load when:** adding social/passwordless login to a React app, calling `registerEnokiWallets`, wiring the OAuth sign-in flow through dApp Kit hooks, reading the user's zkLogin address, or handling network changes / re-registration.
**Covers:** install, `registerEnokiWallets` arguments and the `useEffect` re-registration pattern, filtering Enoki wallets with `isEnokiWallet`, connecting per-provider via `useConnectWallet`, reading the account with `useCurrentAccount`, the auto pop-up OAuth flow, and Enoki Portal configuration (origins/redirects, providers, API keys).

### sponsored-transactions — Gasless / Sponsored Transactions
**Path:** `sponsored-transactions.md`
**Load when:** making transactions free for users, sponsoring gas, building a backend `EnokiClient` sponsor, or scoping what the sponsor will pay for.
**Covers:** the frontend `signAndExecuteTransaction` path through an Enoki wallet, the backend build → sponsor → sign → execute flow with `createSponsoredTransaction` / `executeSponsoredTransaction`, the `jwt` vs `sender` input variants, `allowedMoveCallTargets` / `allowedAddresses` allowlists, `onlyTransactionKind` byte building, and the public-vs-private-key security rule.

### manual-zklogin — zkLogin Without Enoki
**Path:** `manual-zklogin.md`
**Load when:** integrating zkLogin directly with `@mysten/sui` (no Enoki), running your own prover/salt service, or deciding between Enoki and a manual build.
**Covers:** the manual flow (`Ed25519Keypair`, `generateRandomness`, `generateNonce`, `jwtToAddress`, `getExtendedEphemeralPublicKey`, `genAddressSeed`, `getZkLoginSignature`), the salt-management responsibilities and footguns, and an Enoki-vs-manual decision guide.

---

## Routing guide

| Task | Load |
|------|------|
| What is zkLogin / how does it work | concepts |
| How is the Sui address derived from a login | concepts |
| Ephemeral key, nonce, JWT, proof, salt, maxEpoch | concepts |
| Which OAuth providers are supported | concepts |
| Add Google/social login to a React app | frontend-auth |
| `registerEnokiWallets` arguments | frontend-auth |
| Read the logged-in user's Sui address | frontend-auth |
| OAuth redirect / allowed origins not working | frontend-auth |
| Re-register on network change | frontend-auth |
| Make transactions free for users / gasless | sponsored-transactions |
| Backend sponsor with `EnokiClient` | sponsored-transactions |
| Scope what the sponsor pays for | sponsored-transactions |
| Where does the private API key go | sponsored-transactions |
| zkLogin without Enoki / own prover | manual-zklogin |
| User salt management | manual-zklogin |
| Enoki vs manual zkLogin | manual-zklogin + concepts |
| Full integration / code review | **all reference files** |

---

## Key concepts

- **zkLogin** is a Sui protocol primitive. **Enoki** is a managed service that implements zkLogin for you (prover + salt) and adds sponsored transactions. You can use zkLogin without Enoki, but then you own the prover and salt infrastructure.
- The user's **Sui address is derived from `sub` + `iss` + `aud` + `user_salt`** — not from a private key. It is stable across sessions and cannot be converted to/from a normal keypair address.
- An **ephemeral key pair** signs transactions for the duration of a session, bounded by **`maxEpoch`**. Losing the ephemeral key only ends the session; funds are safe because the address is derived from the OAuth identity + salt.
- The **current Enoki frontend flow** registers Enoki accounts as **dApp Kit wallets** (`registerEnokiWallets`) and uses standard dApp Kit hooks (`useWallets`, `useConnectWallet`, `useCurrentAccount`, `useSignAndExecuteTransaction`). There is no separate Enoki provider component in the current API.
- **Two API keys:** a **public** key for the frontend (`registerEnokiWallets`) and a **private** key for the backend (`EnokiClient`). Configure providers, allowed origins, and keys in the **Enoki Portal** (`https://portal.enoki.mystenlabs.com`).
- **Sponsorship is its own flow.** It is configured/authorized server-side and scoped with allowlists; it is not implied by signing through an Enoki wallet.

## Rules

- Never put the **private/secret** Enoki API key in frontend code or any bundle shipped to the browser. Frontend gets the **public** key only.
- Use the current `registerEnokiWallets` + dApp Kit hook flow. Do not generate `EnokiFlow`, `useEnokiFlow`, `useZkLogin`, `useAuthCallback`, or `EnokiFlowProvider` — they are absent from current docs.
- Enoki wallets are bound to a single network. Re-register (`registerEnokiWallets`) whenever the dApp Kit network changes, and call the returned `unregister` on cleanup.
- Always scope sponsorship with `allowedMoveCallTargets` (and optionally `allowedAddresses`) so the sponsor only pays for intended calls.
- Build the sponsored transaction bytes on the client with `tx.build({ client, onlyTransactionKind: true })` — pass `transactionKindBytes`, not a fully-built transaction with gas data.
- When using Enoki, do **not** also hand-roll user-salt storage — Enoki manages the salt. Only manage salt yourself in a fully manual zkLogin integration.
- Enoki wallet signing auto-approves (no confirmation pop-up). Add your own confirmation/cancel UI before executing.
- Configure matching redirect URLs / allowed origins in **both** the Enoki Portal and each OAuth provider's console.

## Common mistakes

- **Shipping the private API key to the browser.** It can authorize gas sponsorship — treat it like a server secret. Frontend uses the public key.
- **Generating the legacy `EnokiFlow` API.** The current flow is `registerEnokiWallets` + dApp Kit hooks; the old flow does not appear in current docs.
- **Assuming signing through Enoki makes a transaction gasless.** Sponsorship is a separate, server-authorized flow with an allowlist.
- **Forgetting to re-register on network change.** Enoki wallets are network-bound; a stale registration leaves accounts non-functional after switching networks.
- **Manually managing user salt while also using Enoki.** Enoki owns the salt; doing both leads to mismatched/lost addresses.
- **Omitting `allowedMoveCallTargets`.** An unscoped sponsor can be drained by paying for arbitrary move calls.
- **Mismatched redirect URLs.** If the Portal/provider redirect config doesn't match the app origin, the OAuth flow fails silently.
