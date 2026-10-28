# Sui facilitators

A facilitator verifies signed payment payloads and settles them on-chain. It holds no custody of funds — the payment payload is the payer's own signed transaction, which the facilitator can only simulate (verify) or broadcast (settle).

## The hosted option — Tentacle Pay (mainnet + testnet)

Hosted, free facilitator at `https://facilitator.tentaclepay.com`, registering the `exact` scheme for `sui:mainnet` and `sui:testnet` (per its docs, docs.tentaclepay.com/x402/facilitator):

- `POST /verify` — checks a signed payment against the stated requirements without settling.
- `POST /settle` — submits to Sui and waits for finality; returns the transaction digest.
- `GET /supported` — schemes, networks, and tokens.
- Sellers never touch an RPC node; wire the standard x402 server middleware at it and use `HTTPFacilitatorClient` from `@x402/core/server`.
- Self-host the same stack via `@tentaclepay/sui-x402`: register `ExactSuiScheme` with a `FacilitatorSuiSigner` whose address sponsors gas.

## Gas sponsorship mechanics (why buyers need no SUI)

- A Sui transaction names a sender and a gas owner separately. In a sponsored payment the buyer is the sender, the facilitator is the gas owner.
- Sui settles stablecoin transfers natively at zero cost at or above the token's native minimum (e.g. `0.01` USDC), so those payments need no sponsorship at all — `gasPrice = 0`, empty gas payment.
- Sub-cent stablecoin payments and non-stablecoin coins draw gas from the facilitator's address balance. The buyer signs first; the facilitator co-signs the same bytes — fully asynchronous, no pre-flight round trip, no fund redirection possible.
- Sponsors can rotate across an address pool to spread load.

## The community option — sui-facilitator (Sui Overflow 2026)

`https://sui-facilitator.onrender.com` (DrVelvetFog, Apache-2.0, repo: DrVelvetFog/sui-x402-facilitator):

- Spec-conformant x402 v2 facilitator; started on `sui:testnet` with a documented intent to harden before mainnet; the author's Sui Overflow submission reports mainnet settlements since June 2026, with digests in the repo's PROOF.md — treat mainnet readiness as community-reported and verify a fresh digest yourself before relying on it.
- Ships tooling around it: an x402 conformance MCP (`x402-pilot`) that recomputes any settlement from on-chain truth, and a runnable buyer/seller demo (`x402-sui-stack`).
- Notable extra: the same endpoint can offer a second "door" — a wallet holding a proof-of-real-personhood credential reads free while agents pay per call, using Sui object ownership as the discriminator.

## Who does NOT settle Sui

The major EVM/Solana x402 facilitators (for example Coinbase's CDP facilitator) settled EVM/Solana/Stellar routes but not Sui's `exact` scheme as of the Sui facilitator forum thread (July 2026). Sui settlement comes from Sui-native facilitators — the ones above. Re-check the x402-foundation/x402 registry and spec PRs (x402-foundation/x402, Sui exact-scheme PRs incl. the settlement-receipt binding extension #2666) for current coverage before committing middleware to a facilitator.

## Choosing checklist

1. Networks you need: `sui:mainnet` and/or `sui:testnet`.
2. Fee schedule and gas sponsor (buyer-side effect on total cost).
3. Custody model: the facilitator must relay, never redirect — confirm the payload-is-the-signed-txn property.
4. Receipt ergonomics: digest returned per settle, re-computable on Suiscan.
