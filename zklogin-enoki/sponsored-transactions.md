# Gasless / Sponsored Transactions

Sourced from [docs.enoki.mystenlabs.com/ts-sdk/transactions](https://docs.enoki.mystenlabs.com/ts-sdk/transactions), `/ts-sdk/sponsored-transactions`, and the [`@mysten/enoki` source](https://github.com/MystenLabs/ts-sdks/tree/main/packages/enoki) (`EnokiClient`). Sponsorship lets your app pay gas so users transact without holding SUI.

> This file covers sponsorship **as used with Enoki + zkLogin**. For the native, protocol-level Sui sponsored-transaction flow (sponsor + `GasData` dual signatures, gas-station patterns, and the equivocation / locked-object risks) — including sponsoring transactions for users who do *not* use Enoki — see the separate **`sui-sponsored-transactions`** skill.

> **Signing ≠ sponsorship.** Signing a transaction through an Enoki wallet does not by itself make it gasless. Sponsorship is a separate, server-authorized flow with an allowlist. Don't conflate the two.

## Frontend: signing through an Enoki wallet

For a normal (user-pays) transaction, use the standard dApp Kit hook — the connected Enoki wallet signs it:

```typescript
import { Transaction } from '@mysten/sui/transactions';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';

function Demo() {
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  async function handleClick() {
    const transaction = new Transaction();
    // transaction.moveCall({ ... }) etc.
    const { digest } = await signAndExecuteTransaction({ transaction });
  }
}
```

Enoki wallet signing **auto-approves** (no confirmation pop-up), so add your own confirm/cancel UI. For a fully **sponsored** transaction, the sponsoring is authorized by your backend using the private key (below).

## Backend: `EnokiClient` sponsor

The **private/secret** Enoki API key lives **only on the server**. It can authorize gas sponsorship, so treat it like any other server secret.

```typescript
import { EnokiClient } from '@mysten/enoki';

const enoki = new EnokiClient({
  apiKey: process.env.ENOKI_PRIVATE_API_KEY!, // backend only
});
```

### The build → sponsor → sign → execute flow

**1. Client builds transaction-kind bytes** (no gas data). Crucially, use `onlyTransactionKind: true`:

```typescript
const transactionKindBytes = await tx.build({
  client: suiClient,
  onlyTransactionKind: true,
});
// send transactionKindBytes (+ sender) to your backend
```

**2. Backend creates the sponsored transaction.** The input takes **either** a `jwt` **or** a `sender` (+ optional allowlists) — verified input type:

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
  sender: '0xUSER_ZKLOGIN_ADDRESS',
  transactionKindBytes,
  allowedMoveCallTargets: ['0xPKG::module::function'], // scope what you pay for
  // allowedAddresses: ['0x...'],                       // optionally scope by sender
});
// sponsored exposes `bytes` to sign and a `digest` to execute with
```

**3. Sign** the returned `bytes` with the sender's key (the user's ephemeral/zkLogin signature via their Enoki wallet, or a keypair) to produce a `signature`.

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

> The `{ bytes, digest }` shape returned by `createSponsoredTransaction` is consistent with the README usage but was not quoted verbatim from the type source — treat the return field names as the documented usage pattern and verify against installed SDK types if exactness matters.

### `jwt` vs `sender` variant

- **`jwt`** — identify the user by their zkLogin JWT; Enoki resolves the sender. Use when the backend has the user's JWT.
- **`sender` + allowlists** — identify the user by address and explicitly scope sponsorship with `allowedMoveCallTargets` / `allowedAddresses`.

The two are mutually exclusive (enforced by the type union). You cannot pass both.

## Security rules

- **Private key is backend-only.** Never ship it to the browser or any client bundle. The frontend uses the public key (`registerEnokiWallets`).
- **Always scope sponsorship.** Set `allowedMoveCallTargets` (and optionally `allowedAddresses`) so the sponsor only pays for your app's intended move calls. An unscoped sponsor can be drained by paying for arbitrary calls.
- **Build with `onlyTransactionKind: true`.** Pass `transactionKindBytes`, not a fully-built transaction with gas data — the sponsor supplies the gas.

## Other `EnokiClient` methods

For lower-level / manual zkLogin via Enoki's prover: `getApp`, `getZkLogin`, `getZkLoginAddresses`, `createZkLoginNonce`, `createZkLoginZkp`, plus SuiNS subname helpers (`getSubnames`, `createSubname`, `deleteSubname`). Most apps only need `createSponsoredTransaction` / `executeSponsoredTransaction` plus the frontend flow in `frontend-auth.md`.
