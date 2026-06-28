# How zkLogin Works

Sourced from [docs.sui.io/concepts/cryptography/zklogin](https://docs.sui.io/concepts/cryptography/zklogin) and [docs.enoki.mystenlabs.com](https://docs.enoki.mystenlabs.com). If unsure about any detail, fetch from these pages rather than guessing.

## What zkLogin is

zkLogin is a Sui protocol primitive that lets a user send transactions from a Sui address using an OAuth/OIDC credential (a normal web login), **without a seed phrase or private key the user has to manage, and without publicly linking the OAuth identity to the on-chain address.**

The key property: the on-chain address is controlled by "whoever can log into this OAuth account (plus a salt)", proven in zero knowledge, so observers cannot tell which Google/Facebook/Twitch account owns which Sui address.

## The elements of the flow

| Element | Role |
|---|---|
| **OAuth/OIDC provider** | Authenticates the user and issues a JWT (`id_token`). OpenID Connect over OAuth 2.0. |
| **Ephemeral key pair** `(eph_sk, eph_pk)` | Generated per session. Signs transactions while the session is valid. Losing it only ends the session — funds stay safe. |
| **Nonce** | Embeds a hash of the ephemeral public key + expiry (`maxEpoch`) + randomness. Sent in the OAuth request so the returned JWT is bound to this session. |
| **JWT** | Issued by the provider. Key claims: `iss` (issuer/provider), `aud` (app/client ID), `sub` (stable per-user ID). |
| **ZK proof** | A Groth16 zkSNARK proving the nonce was derived correctly, the provider's RSA signature on the JWT is valid, and the address derivation is correct — all **without revealing** the OAuth data on-chain. |
| **User salt** | A secret value that **unlinks** the OAuth identifier from the on-chain address. Required for both proof generation and address derivation. |

## Address derivation

The Sui address is derived from:

```
address = f(sub, iss, aud, user_salt)
```

Consequences:
- The address is **stable** across logins as long as `sub`, `iss`, `aud`, and `user_salt` stay the same.
- It is **not** derived from a private key and cannot be converted to/from a normal keypair address.
- Changing the OAuth client ID (`aud`) or the salt changes the address — i.e. the user loses access to the old one. (See `manual-zklogin.md` for the salt footguns.)

## Session expiry (`maxEpoch`)

A login session can only authorize transactions up to `maxEpoch` (a future Sui epoch chosen at login time, e.g. `currentEpoch + N`). When it expires, the user re-authenticates with the provider; the **address stays the same**, only the ephemeral session is renewed.

## Supported OAuth providers

Per docs.sui.io, supported on mainnet/testnet/devnet: **Google, Facebook, Twitch, Apple, AWS (Tenant), Karrier One, Credenza3**. Devnet-only: **Slack, Kakao, Microsoft**.

Enoki's frontend SDK exposes a first-class provider map for **Google, Facebook, and Twitch** (see `frontend-auth.md`). For providers outside that map, verify current Enoki support in the Enoki Portal / docs before promising it.

## What Enoki manages for you

zkLogin by itself requires you to run a ZK proving service and manage user salts. **Enoki** is Mysten Labs' managed service that handles both, and adds sponsored transactions:

| Responsibility | Manual zkLogin | With Enoki |
|---|---|---|
| ZK prover | You run/host it | Enoki runs it |
| User salt storage & derivation | **You own it** (high-risk) | Enoki manages it |
| Ephemeral key / nonce / session | You build it | Enoki SDK handles it via dApp Kit |
| Sponsored (gasless) transactions | Build your own gas station | Built in (`EnokiClient`) |
| Networks | mainnet / testnet / devnet | mainnet / testnet |

Rule of thumb: **use Enoki unless you have a specific reason to self-host the prover and salt.** The main reason teams regret a manual build is salt management — losing salts permanently locks users out of their addresses.
