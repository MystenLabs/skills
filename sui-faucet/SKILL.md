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

The hosts, endpoint paths, field names, and encodings below are stable. State them
directly, including in headless CI where no browser is available. Read the live
[faucet usage guide](https://faucet.sui.io/how-to-use) and the
[proof-of-work specification](https://faucet.sui.io/pow-spec/) to confirm current
Argon2d cost parameters, difficulty and threshold values, rate limits, and any
error code not listed here.

For CLI environment and address configuration, use the `sui-client` skill.

## Hosts
- Devnet: `https://faucet.devnet.sui.io`
- Testnet: `https://faucet.testnet.sui.io`

Pick one host and use it for both calls. The documentation site `faucet.sui.io` is
a different origin — never send API requests to it.

## Rules
- Use `GET /v3/challenge?recipient=<address>`, compute the proof locally, then
  `POST /v3/gas` to the same host. A recipient alone is not enough. There is no
  v3 SDK helper — do not invent one and do not fall back to a v2 SDK function.
- Keep host, network, and recipient consistent across both calls. The recipient is
  a lowercase `0x` address of 64 hex characters, identical in both requests.
- Before spending CPU, check the challenge response: the chain ID matches the
  network you called, the recipient matches the address you asked for, and the
  proof `version` and its hashing parameters are ones you support. Re-request the
  challenge on any mismatch. HTTP API version `v3` does not mean proof version 3 —
  read the `version` field, not the path.
- Build the Argon2d preimage from the challenge fields in order, joined with
  newlines (U+000A) and no trailing newline: domain (`sui-faucet-pow/1`), chain ID,
  checkpoint sequence, checkpoint digest, checkpoint randomness, faucet address,
  recipient, nonce. Read the first 8 bytes of the 32-byte output as a big-endian
  unsigned 64-bit integer `v`; the solution is valid when `v < threshold`. Use
  integer arithmetic for nonce, threshold, and difficulty — never floats.
- POST a flat JSON object with `Content-Type: application/json` and exactly these
  string fields: `recipient`, `checkpointSeq`, `nonce`, `hashHex`. `checkpointSeq`
  and `nonce` are decimal strings — no leading zeros, no sign, no separators, no
  hex, no scientific notation. `hashHex` is the complete 32-byte Argon2d output as
  exactly 64 lowercase hex characters, with no `0x` prefix and no truncation.
  There is no wrapper object: `{"FixedAmountRequest": {...}}` is the legacy
  `/v2/gas` body and v3 does not accept it.
- Read `amountMist` from the response rather than assuming a fixed payout. Funds
  arrive in the recipient's address balance, not as a new coin object.
- Save the exact proof and response. On `payout_status_unknown`, resubmit the same
  fields rather than re-solving. `already_used` returns the digest of the original
  payout. `stale_checkpoint` means fetch a fresh challenge and solve again.

## Example
```
GET https://faucet.testnet.sui.io/v3/challenge?recipient=0x<64 hex characters>
```

Read back the chain ID, checkpoint sequence, checkpoint digest, checkpoint
randomness, faucet address, recipient, proof `version`, hashing parameters, and
`threshold`. Solve for a nonce locally, then:

```
POST https://faucet.testnet.sui.io/v3/gas
Content-Type: application/json

{
  "recipient": "0x<64 hex characters>",
  "checkpointSeq": "123456789",
  "nonce": "4242",
  "hashHex": "<64 lowercase hex characters>"
}
```

A success response carries `digest`, `recipient`, and `amountMist`
(1 SUI = 1,000,000,000 MIST).
