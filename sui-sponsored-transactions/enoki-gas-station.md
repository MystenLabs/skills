# Managed Sponsorship with Enoki

Sourced from [docs.enoki.mystenlabs.com/ts-sdk/sponsored-transactions](https://docs.enoki.mystenlabs.com/ts-sdk/sponsored-transactions) and the [`@mysten/enoki` source](https://github.com/MystenLabs/ts-sdks/tree/main/packages/enoki). Enoki is a managed gas station built on the same native mechanism in `native-flow.md` — it runs the gas-coin pool and signs as sponsor for you.

> Choose Enoki when you don't want to operate a gas station (coin pool, equivocation handling, sponsor key management). Choose the native flow when you need full control or want to avoid the managed dependency. The two are interchangeable at the protocol level — both produce a dual-signed sponsored transaction.

## Setup (backend)

The **private/secret** Enoki API key lives **only on the server** — it authorizes sponsorship.

```typescript
import { EnokiClient } from '@mysten/enoki';

const enoki = new EnokiClient({
  apiKey: process.env.ENOKI_PRIVATE_API_KEY!, // backend only
});
```

## Build → sponsor → sign → execute

**1. Client builds transaction-kind bytes** (no gas data):

```typescript
const transactionKindBytes = await tx.build({
  client: suiClient,
  onlyTransactionKind: true,
});
// send transactionKindBytes (+ sender) to the backend
```

**2. Backend creates the sponsored transaction.** Pass **either** a `jwt` **or** a `sender` (+ optional allowlists) — verified input type:

```typescript
type CreateSponsoredTransactionApiInput = {
  network?: EnokiNetwork;          // 'testnet' | 'mainnet'
  transactionKindBytes: string;
} & (
  | { jwt: string; sender?: never; allowedAddresses?: never; allowedMoveCallTargets?: never }
  | { sender: string; allowedAddresses?: string[]; allowedMoveCallTargets?: string[]; jwt?: never }
);
```

```typescript
const sponsored = await enoki.createSponsoredTransaction({
  network: 'mainnet',
  sender: '0xUSER_ADDRESS',
  transactionKindBytes,
  allowedMoveCallTargets: ['0xPKG::module::function'], // scope what you pay for
  // allowedAddresses: ['0x...'],
});
// sponsored exposes `bytes` to sign and a `digest` to execute with
```

**3. Sign** the returned `bytes` with the sender's key (their wallet / zkLogin signature) → `signature`.

**4. Backend executes** — verified input type:

```typescript
interface ExecuteSponsoredTransactionApiInput {
  digest: string;
  signature: string;
}
```

```typescript
await enoki.executeSponsoredTransaction({
  digest: sponsored.digest,
  signature,
});
```

> The `{ bytes, digest }` return shape of `createSponsoredTransaction` matches the documented usage but was not quoted verbatim from the type source — verify against installed SDK types if exactness matters.

## `jwt` vs `sender` variant

- **`jwt`** — identify the user by their zkLogin JWT; Enoki resolves the sender. Use when the backend has the user's JWT (zkLogin apps).
- **`sender` + allowlists** — identify the user by address and explicitly scope sponsorship.

The two are mutually exclusive (enforced by the type union).

## Security rules

- **Private key is backend-only.** Never ship it to the browser. (The frontend public key is only for registering Enoki wallets — see the `zklogin-enoki` skill.)
- **Always scope sponsorship** with `allowedMoveCallTargets` (and optionally `allowedAddresses`) so the gas station only pays for your app's intended calls. An unscoped sponsor can be drained.
- **Build with `onlyTransactionKind: true`** — pass `transactionKindBytes`, not a fully-built transaction; Enoki supplies the gas.

## Enoki vs self-hosted gas station

| Factor | Self-hosted (native) | Enoki |
|---|---|---|
| Gas-coin pool / equivocation handling | You operate it (see `security.md`) | Managed |
| Sponsor key management | You hold the key | Managed (private API key) |
| Scoping | Validate kind server-side yourself | `allowedMoveCallTargets` / `allowedAddresses` |
| Networks | any | mainnet / testnet |
| Control | Maximum | Bounded by Enoki |
