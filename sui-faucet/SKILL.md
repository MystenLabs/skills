---
name: sui-faucet
description: >
  Request test SUI through the Sui faucet's proof-of-work HTTP API. Use when
  integrating faucet requests into agents, scripts, or CI, using GET /v3/challenge
  or POST /v3/gas, computing an Argon2d faucet proof, migrating from /v2/gas,
  or recovering from stale_checkpoint, invalid_proof, already_used, or
  payout_status_unknown errors.
---

# Sui faucet

The Sui faucet sends test SUI to a recipient after verifying a proof of work.
Agents and CI can call the HTTP API without a browser, wallet connection,
private key, or transaction signature. The faucet pays gas.

Start with the public [faucet usage guide](https://faucet.sui.io/how-to-use).

## Reference files

| Task | Load |
| --- | --- |
| Request test SUI, submit a proof, or recover a failed request | [api.md](api.md) |
| Implement or debug proof computation | [Public proof-of-work specification](https://faucet.sui.io/pow-spec/) |
| Build a complete integration | `api.md` and the public proof-of-work specification |

For CLI environment and address configuration, use the `sui-client` skill.

## Rules

- Use `GET /v3/challenge`, compute a proof locally, then call `POST /v3/gas`.
  A recipient alone is not enough. Do not invent a v3 SDK helper.
- Keep the API base URL, network, and recipient consistent throughout the flow.
  The documentation website and API can have different origins.
- Validate proof version 1 and its fixed hashing parameters before spending CPU.
  HTTP API version `v3` does not mean proof version 3.
- Send `recipient`, `checkpointSeq`, `nonce`, and the complete `hashHex` as JSON
  strings. Use integer arithmetic for nonce, threshold, and difficulty.
- Read `amountMist` rather than assuming a fixed payout. Funds arrive in the
  recipient's address balance, not as a new coin object.
- Save the exact proof and response. After an uncertain submission, resolve the
  original transaction before requesting another payout.
- `/v2/gas` is opt-in compatibility for isolated deployments, not a public
  automation fallback or a way to bypass proof of work.

