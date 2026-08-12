# Equivocation, Locking, and Griefing

Sourced from [docs.sui.io/concepts/transactions/sponsored-transactions](https://docs.sui.io/concepts/transactions/sponsored-transactions) and [MystenLabs/Sui_Owned_Object_Pools](https://github.com/MystenLabs/Sui_Owned_Object_Pools). These are the risks a production gas station must handle.

## Equivocation → gas object locked until next epoch

A sponsor's gas coin is an **owned object**. If the same gas object version is used in two competing (equivocating) transactions, validators can split their reservations on it, and the object becomes **locked until the next epoch** — unusable for sponsorship until then.

The docs call this out directly:
- "If another inflight transaction already uses one of those same object versions, the sponsored transaction can be rejected and must be rebuilt or re-signed."
- "If competing transactions split validator reservations, the object can be equivocated until the next epoch."

**Mitigation: a gas-coin pool.** Do not reuse one gas coin version across concurrent sponsored transactions. Maintain a pool of distinct gas coins and hand out a different one per in-flight transaction. Mysten provides [`Sui_Owned_Object_Pools`](https://github.com/MystenLabs/Sui_Owned_Object_Pools) — "tools for managing multiple concurrent transactions … helping to avoid object equivocation and locking." A single-coin gas station will lock up under concurrency.

## Concurrent object use / re-signing

Because the sponsored transaction is signed over specific object versions (including the gas coins), an inflight transaction touching the same versions forces the sponsored transaction to be **rebuilt or re-signed**. Design the sponsor backend to rebuild on conflict rather than retrying the identical bytes.

## Censorship / griefing

If the user submits the dual-signed transaction **through the sponsor / gas station** rather than directly to a full node, the sponsor "might delay or withhold the transaction from the network."

**Mitigation:** the user holds fully dual-signed bytes and can **submit them directly to a full node**, bypassing a misbehaving sponsor. Where censorship resistance matters, return the signed bytes to the client and let it submit.

## Gas-coin requirements

- The sponsor must hold SUI gas coins owned by the **sponsor address** (= `GasData.owner`).
- `GasData.payment` is a `Vec<ObjectRef>` — multiple coins allowed, but **all must share the same owner** (the sponsor).
- `GasData.price` (reference gas price) and `GasData.budget` complete the struct; the SDK auto-fills them via dry-run unless overridden with `setGasPrice` / `setGasBudget`.
- A gas station typically **reserves** coins from its pool per request so concurrent transactions never share a coin version.

## Scoping (when using a sponsor backend / Enoki)

Independent of the locking risk, scope **what** you sponsor so the gas station can't be drained by paying for arbitrary calls. With Enoki, set `allowedMoveCallTargets` (and optionally `allowedAddresses`) — see `enoki-gas-station.md`. With a self-hosted gas station, validate the transaction kind server-side before attaching gas.

## Checklist for a production gas station

- [ ] Gas coins owned by the sponsor address; `setGasOwner(sponsorAddress)`.
- [ ] A pool of distinct gas coins; one coin version per in-flight transaction.
- [ ] Rebuild/re-sign on object-version conflict rather than blind retry.
- [ ] Server-side validation of the transaction kind before sponsoring (allowlist).
- [ ] Return dual-signed bytes to the client so it can submit directly if needed.
