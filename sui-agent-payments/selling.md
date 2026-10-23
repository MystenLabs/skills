# Monetizing an API on Sui (seller side)

## Path A — front-door listing (least work)

The Sui rail's listing model (per its FAQ): send the endpoint, a price per call, and a short description. You keep serving the endpoint you already run; the gateway handles the 402 and the settlement, and returns a receipt with every paid call.

- Status check first: the rail's listing flow was **invite-only, testnet-only** as of 2026-10-23 with "submit an API" and the directory marked "coming soon". Verify the live pages (sui.io/agentpayments and /agentpayments/directory) before you promise anything to a customer.
- Machine-readable discovery: the directory ships as a SKILL.md and a JSON endpoint (llms.txt), so agents can read it, compare prices per call, and buy without human approval per call.

## Path B — self-hosted 402 (you stay the operator)

Wire standard x402 server middleware into your existing service and point it at a Sui facilitator (facilitators.md):

1. Middleware catches the bare request → responds `402` with payment requirements (price, asset `USDC`, network `sui:mainnet` or `sui:testnet`, your payTo address, facilitator URL).
2. On retry with a signed payment payload, middleware calls `POST /verify` then `POST /settle` at the facilitator; the facilitator broadcasts the buyer's signed transaction and returns the digest.
3. Deliver the response with the receipt attached. You keep your own catalog, analytics, receipts, and customer relationship.
4. Self-host the facilitator itself if you need no third party: Tentacle's `@tentaclepay/sui-x402` (`x402Facilitator` + `ExactSuiScheme` + `FacilitatorSuiSigner`) or the community Apache-2.0 facilitator.

Path B is what keeps receipts, ledger tooling, and settlement analytics yours. Multi-rail operators answer 402 with several offerings (one per rail) so buyers on any network can pay.

## Pricing notes

- Per-call micro-pricing is the rail's native unit; sub-cent prices are the point of the rail. Anchor prices in the single-digit cents for simple data calls; higher only for outcome-shaped deliverables.
- Never price lower than your COGS; sponsored gas means the buyer's floor is your service price, not the chain cost.
- List discoverability surfaces alongside price: SKILL.md, llms.txt, and an MCP endpoint. Agents pick cheap, fast, and available — availability and price are legible to them.

## Common seller mistakes

- Re-pricing after listing without versioning the 402 terms.
- Treating "paid but failed" as the buyer's problem — settlement and delivery are separate outcomes, and refundable offers exist precisely for this; decide your refund policy deliberately.
- Testing only on mainnet-free happy paths — rehearse the full 402 loop on testnet first.