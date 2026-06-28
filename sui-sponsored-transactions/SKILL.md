---
name: sui-sponsored-transactions
description: >
  Sponsored (gasless) transactions on Sui — paying a user's gas so they transact
  without holding SUI. Use this skill whenever the user wants a "gas station",
  "gasless", "fee-less", or "sponsored" transactions, wants their app to pay gas
  for users, is wiring up the native Sui sponsor + GasData dual-signature flow with
  the TypeScript SDK (`setGasOwner`, `setGasPayment`, `Transaction.fromKind`,
  `onlyTransactionKind`, executing with two signatures), is building or operating a
  gas station / sponsor backend, or needs to understand the equivocation /
  locked-gas-object risk. Covers both the native protocol mechanism (works with any
  Sui wallet/keypair) and the managed Enoki gas station. For passwordless zkLogin
  social login specifically, use the `zklogin-enoki` skill instead.
---

# Sui Sponsored Transactions

> **MCP tool:** When available in your environment, also query the Sui documentation MCP server (`https://sui.mcp.kapa.ai`) for up-to-date answers. Use it for verification and for details not covered by these reference files.

> **Source constraint:** All information in this skill is sourced exclusively from official Mysten Labs documentation: [docs.sui.io](https://docs.sui.io), [sdk.mystenlabs.com](https://sdk.mystenlabs.com), [docs.enoki.mystenlabs.com](https://docs.enoki.mystenlabs.com), and the [MystenLabs](https://github.com/MystenLabs) source. When extending or updating this skill, only pull from these sources. Do not use third-party blogs or tutorials, and do not extrapolate SDK method names — verify them against the typedoc.

A sponsored transaction lets one party (the **sponsor**) pay the gas for another party's (the **user's**) transaction. The user never needs to hold SUI. This is the foundation of "gasless" onboarding on Sui.

Sui supports this **natively at the protocol level**: a transaction carries a `GasData` whose gas coins are owned by the sponsor, and **both** the user and the sponsor sign the same transaction bytes. This works with any Sui wallet or keypair. [Enoki](https://docs.enoki.mystenlabs.com) provides a managed gas station on top of the same mechanism.

This skill prevents the most common AI-coding mistakes here:

1. **Putting the gas coins under the wrong owner.** In `GasData`, the gas payment objects must be owned by the **sponsor** (`setGasOwner(sponsorAddress)`), not the sender. Getting this wrong means it isn't sponsored.
2. **Forgetting the second signature.** A sponsored transaction needs **two** signatures — the user's and the sponsor's — over the *same* `TransactionData`. Executing with one fails.
3. **Ignoring the equivocation / locked-object risk.** Reusing the same sponsor gas coin across concurrent transactions can lock it until the next epoch. Production gas stations need a coin pool.
4. **Using deprecated v1 SDK names.** The current API is `@mysten/sui` (`Transaction`, `signTransaction`), not `@mysten/sui.js` (`TransactionBlock`, `signTransactionBlock`).

This skill routes to focused reference files. Load only the ones relevant to the current task.

---

## Reference files

### native-flow — Native Sponsored Transactions (TypeScript SDK)
**Path:** `native-flow.md`
**Load when:** implementing sponsorship with `@mysten/sui` directly, building the dual-signature flow, splitting work between a frontend and a sponsor backend, or choosing among the user-proposed / sponsor-proposed / wildcard patterns.
**Covers:** the three roles and `GasData`, building `onlyTransactionKind` bytes, `Transaction.fromKind`, `setSender` / `setGasOwner` / `setGasPayment` / `setGasBudget` / `setGasPrice`, signing with both keypairs, executing with a two-signature array (gRPC `signatures` vs JSON-RPC `signature`), and the three sponsorship patterns.

### enoki-gas-station — Managed Sponsorship with Enoki
**Path:** `enoki-gas-station.md`
**Load when:** using Enoki to sponsor transactions instead of running your own gas station, calling `EnokiClient.createSponsoredTransaction` / `executeSponsoredTransaction`, or scoping sponsorship with allowlists.
**Covers:** the managed build → sponsor → sign → execute flow, the `jwt` vs `sender` input variants, `allowedMoveCallTargets` / `allowedAddresses`, the public-vs-private API key rule, and when to choose Enoki over a self-hosted gas station.

### security — Equivocation, Locking, and Griefing
**Path:** `security.md`
**Load when:** operating a gas station in production, hardening a sponsor backend, or debugging locked gas objects / rejected sponsored transactions.
**Covers:** the equivocation → locked-until-next-epoch risk, concurrent gas-object reuse, the gas-coin pool mitigation (Sui_Owned_Object_Pools), censorship/griefing and direct-to-fullnode submission, and gas-coin reservation requirements.

---

## Routing guide

| Task | Load |
|------|------|
| What is a sponsored transaction / how it works | SKILL.md only |
| The three roles and GasData | native-flow |
| Implement sponsorship with `@mysten/sui` | native-flow |
| Build transaction-kind bytes on the client | native-flow |
| Set the sponsor as gas owner | native-flow |
| Execute with two signatures | native-flow |
| User-proposed vs sponsor-proposed vs wildcard | native-flow |
| Sponsor with Enoki instead of self-hosting | enoki-gas-station |
| Scope what the sponsor pays for | enoki-gas-station + security |
| Where does the private API key go | enoki-gas-station |
| Gas object got locked / equivocation | security |
| Production gas station hardening | security |
| Sponsor withholding / censorship | security |
| Full integration / code review | **all reference files** |

---

## Key concepts

- **Three roles:** the **user** (wants to transact), the **gas station** (provides gas payment objects), and the **sponsor** (funds the gas station). Often the gas station and sponsor are the same backend.
- **`GasData` owner is the sponsor.** A transaction's `GasData` has `payment` (gas coins), `owner` (the sponsor address), `price`, and `budget`. The gas coins must be owned by `owner`. Set it with `tx.setGasOwner(sponsorAddress)`.
- **Two signatures over the same bytes.** Both the user and the sponsor sign the identical `TransactionData` (which includes `GasData`). Execution submits both signatures.
- **Current SDK:** `@mysten/sui`, class `Transaction`, `keypair.signTransaction(bytes)`. The v1 `@mysten/sui.js` / `TransactionBlock` / `signTransactionBlock` API is deprecated.
- **Enoki** is the managed option: it runs the gas station and signs as sponsor for you, scoped by allowlists. Native sponsorship gives you full control but you operate the gas-coin pool.

## Rules

- The gas payment coins must be owned by the **sponsor**; set `tx.setGasOwner(sponsorAddress)`. All coins in `GasData.payment` must share one owner.
- A sponsored transaction requires **both** the user's and the sponsor's signatures over the same built bytes. Do not execute with only one.
- The user builds only the transaction *kind* (`tx.build({ client, onlyTransactionKind: true })`); the sponsor reconstructs it with `Transaction.fromKind(...)` and attaches gas data.
- Do not reuse the same sponsor gas-coin version across concurrent sponsored transactions — it risks equivocation and locking the coin until the next epoch. Use a coin pool (see security).
- Use the current `@mysten/sui` `Transaction` API, not the deprecated `@mysten/sui.js` `TransactionBlock` API.
- With Enoki, keep the **private** API key on the backend and scope sponsorship with `allowedMoveCallTargets`.

## Common mistakes

- **Gas owned by the sender, not the sponsor.** Then the sender pays gas — it isn't sponsored. The gas coins must be the sponsor's, with `setGasOwner` pointing at the sponsor.
- **Executing with a single signature.** Sponsored transactions need both signatures over the same `TransactionData`.
- **Building a full transaction on the client.** The user should build with `onlyTransactionKind: true`; the sponsor adds gas. Building full gas data on the client defeats sponsorship.
- **Reusing one gas coin concurrently.** Leads to equivocation and a coin locked until the next epoch. Operate a pool.
- **Reaching for deprecated v1 names** (`TransactionBlock`, `signTransactionBlock`). Use `Transaction` and `signTransaction`.
- **Submitting only through the sponsor.** A malicious sponsor could withhold the transaction; the user can submit the dual-signed bytes directly to a full node.
