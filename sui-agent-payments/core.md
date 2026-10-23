# The 402 payment flow on Sui

## The loop, step by step

1. **Request:** the agent calls the resource with an ordinary HTTP request.
2. **Terms:** the resource (or its gateway) responds `402 Payment Required` with machine-readable payment requirements — price per call, asset, network, recipient (`payTo`), facilitator.
3. **Sign:** the agent builds an exact USDC transfer for the stated amount and recipient and signs the complete transaction itself. The payment payload is the payer's own signed transaction — facilitators are non-custodial by construction; they verify it, then broadcast it verbatim.
4. **Settle:** the facilitator submits the transaction, waits for finality, and returns the digest.
5. **Retry + delivery:** the agent retries the original request with the payment attached; the resource returns `200` with a receipt (digest) attached.

## Dialects: x402 and MPP in one response

Per the Sui rail's own FAQ: one `402` response can carry an **MPP challenge** in the `WWW-Authenticate` header and **x402 offers** in the JSON body — same challenge ID, same economic terms. A client uses whichever dialect the resource advertises, never both. When in doubt, probe: `curl -i <resource>` and read what the 402 advertises before choosing a client stack.

## On-chain spend grants (the rail's control plane)

Owners fund one shared pool per asset and grant agents scoped access. The grant is on-chain state, enforced at settlement — not a server-side session:

- **Allowed services** — which listings the agent may buy
- **Total budget** — the pool ceiling
- **Per-payment cap** — the max single call price
- **Asset and expiry** — currency and time window
- **Revocable at any time**

A request outside the grant never settles: the rail returns `GRANT_DENIED` instead of a payment attempt. This is what makes "let the agent work unattended" survivable for an owner.

## Payment modes

- **Single payment** — pay per call, immediately settled.
- **Session payment** — pay once for a session of calls.
- **Refunded payment** — only offers explicitly marked refundable; settlement opens a shared RefundVault instead of paying the seller, and a classified delivery failure inside the decision window can be refunded. After the window closes, an unrefunded vault releases to the seller.

## What happens when a call fails after payment

Settlement and delivery are separate outcomes. The receipt is immutable evidence that payment happened — preserve it and reconcile against chain state rather than paying again. Do not blindly re-send: "paid but not delivered" is a reconciliation case, not a retry case.