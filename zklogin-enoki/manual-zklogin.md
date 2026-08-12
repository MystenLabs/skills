# zkLogin Without Enoki

Sourced from [docs.sui.io/guides/developer/cryptography/zklogin-integration](https://docs.sui.io/guides/developer/cryptography/zklogin-integration). Functions are from `@mysten/sui`. Use this only when you have a specific reason **not** to use Enoki — you will own a ZK prover and (critically) user-salt management.

> **Default recommendation:** use Enoki (`frontend-auth.md`). Enoki removes salt management and the prover, which are the two hardest, highest-risk parts of a manual build.

## The manual flow

**1. Ephemeral key pair + max epoch**

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const ephemeralKeyPair = new Ed25519Keypair();
const maxEpoch = currentEpoch + 2; // session valid until this epoch
```

**2. Randomness + nonce**

```typescript
import { generateNonce, generateRandomness } from '@mysten/sui/zklogin';

const randomness = generateRandomness();
const nonce = generateNonce(ephemeralKeyPair.getPublicKey(), maxEpoch, randomness);
// put `nonce` in the OAuth authorization URL
```

**3. Get the JWT**

Redirect to the provider with the nonce; on return, read the `id_token` (JWT) and decode it to a `JwtPayload` (claims `iss`, `aud`, `sub`).

**4. User salt — your responsibility (the footgun)**

You must produce a stable `user_salt` per user. Either store a `sub`→salt mapping, or derive it via HKDF from a master seed. The docs explicitly warn:

- **Losing salts = users permanently lose access** to their addresses.
- You **cannot** rotate the master seed or change the OAuth client ID (`aud`) without changing — and thus losing — every derived address.

This is the single biggest reason to use Enoki instead.

**5. Derive the address**

```typescript
import { jwtToAddress } from '@mysten/sui/zklogin';

const userAddress = jwtToAddress(jwt, userSalt, false);
```

**6. Get the ZK proof**

```typescript
import { getExtendedEphemeralPublicKey } from '@mysten/sui/zklogin';

const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(
  ephemeralKeyPair.getPublicKey(),
);
// POST { jwt, extendedEphemeralPublicKey, maxEpoch, jwtRandomness: randomness, salt: userSalt, keyClaimName: 'sub' }
// to a proving service -> response is the PartialZkLoginSignature
```

You host or call a proving service. (Enoki provides one via `EnokiClient.createZkLoginZkp`; see `sponsored-transactions.md`.)

**7. Assemble and execute**

```typescript
import { genAddressSeed, getZkLoginSignature } from '@mysten/sui/zklogin';

// sign the transaction bytes with the ephemeral key to get `userSignature`
const addressSeed = genAddressSeed(
  BigInt(userSalt),
  'sub',
  decodedJwt.sub,
  decodedJwt.aud,
).toString();

const zkLoginSignature = getZkLoginSignature({
  inputs: { ...partialZkLoginSignature, addressSeed },
  maxEpoch,
  userSignature,
});
// execute the transaction with zkLoginSignature
```

## Enoki vs manual — decision guide

| Factor | Manual zkLogin | Enoki |
|---|---|---|
| ZK prover | You host/call one | Managed |
| User salt | **You manage (high risk)** | Managed |
| Sponsored transactions | Build a gas station yourself | Built in |
| Control / customization | Maximum | Bounded by Enoki |
| Operational risk | High (salt loss = lost addresses) | Low |
| Networks | mainnet / testnet / devnet | mainnet / testnet |

Choose **manual** only when you need devnet, full control of the prover/salt, or to avoid the managed dependency — and you can operate salt storage safely. Otherwise choose **Enoki**.
