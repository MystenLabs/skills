# Verifying payments (receipts on Sui)

## What a receipt is

A settlement digest — the Sui transaction in which the USDC transfer moved. It resolves on Suiscan (suiscan.xyz). Per the rail's FAQ: every payment resolves to a digest you can open and check.

## The recompute pattern (don't trust the operator, recompute it)

Confirm a settlement against chain truth: read the transaction's effects and recompute the net USDC credit to the recipient — the net must equal the advertised price (exact-amount guarantees are the spec's point: the seller settles against its own terms, never the client's declared amount).

The community stack (x402-sui-stack, x402-pilot) ships exactly this as a conformance check: fetch the digest, recompute the on-chain net to `payTo`, compare against the advertised amount. Any mismatch is a facilitator/operator bug or an attack — stop and reconcile before taking further calls.

## Replay-protection pitfall (the one that bites integrators)

`dryRunTransactionBlock` simulates against the latest object versions — **an already-executed payment still simulates cleanly**, so dry-run alone cannot detect replays (documented in the Sui facilitator forum thread, 2026-07/08).

Correct protection:

1. Compute the digest locally from the payment bytes (`TransactionDataBuilder.getDigestFromBytes`).
2. Look it up with `getTransactionBlock`.
3. If found, the payment already executed — treat as a replay, do not settle again.

## Read chain state the surviving way

The public Sui JSON-RPC endpoint has been retired — old snippets calling it fail with `-32601`. Read state via **GraphQL or gRPC** (see the accessing-data skill). Two forum-posted bugs were both caused by reading state over the dead RPC: a demo route 500ing after settlement, and a verified-human free-read door silently bouncing humans to the paywall.

## Reconciliation rules

- Settlement and delivery are separate outcomes; a receipt proves payment, not delivery.
- Preserve receipts; reconcile against chain state instead of re-paying.
- Refund only through refundable-offer semantics (RefundVault with a decision window); an ordinary immediate payment is final.

```js
// Sketch: replay-safe verify (facilitator implementers)
const digest = TransactionDataBuilder.getDigestFromBytes(paymentBytes);
const tx = await client.getTransactionBlock({ digest, options: { showEffects: true } });
if (tx) return { replay: true, alreadySettledDigest: digest };
```
