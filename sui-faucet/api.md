# Request SUI with `/v3/gas`

Use this flow for Testnet, Devnet, or a trusted development deployment. Test SUI
has no monetary value; this is not a Mainnet funding service.

## 1. Fetch a challenge

Choose the API base URL:

| Network | Base URL |
| --- | --- |
| Testnet | `https://faucet.testnet.sui.io` |
| Devnet | `https://faucet.devnet.sui.io` |
| Custom | The operator's API base URL |

Replace the recipient placeholder with your address, normalized to `0x` plus
64 lowercase hexadecimal characters. Short addresses are left-padded with zeros.
These examples require `curl`. See the public
[faucet usage guide](https://faucet.sui.io/how-to-use) for the complete workflow.

```sh
export FAUCET=https://faucet.testnet.sui.io
export NETWORK=testnet
export RECIPIENT=0xYOUR_64_HEX_CHARACTER_ADDRESS

curl --fail-with-body --get "$FAUCET/v3/challenge" \
  --data-urlencode "recipient=$RECIPIENT" \
  --output challenge.json
```

Stop if the request fails. The response includes:

- Proof inputs: `domain`, `chainId`, `checkpointSeq`, `checkpointDigest`,
  `randomBytes`, `faucetAddress`, and `recipient`.
- Hash parameters: `version`, `algorithm`, `argon2Version`, `salt`, `memorySize`,
  `iterations`, `parallelism`, and `hashLength`.
- Policy: `network`, `difficulty`, `difficultyBase`, `threshold`,
  `expectedAttempts`, `windowSeconds`, and `amountMist`.

Check `network` and `recipient` against your request and validate the fixed
parameters before computing. `amountMist` is a decimal string; one SUI is
1,000,000,000 MIST. The server chooses the amount. The proof does not bind it to
an earlier payout quote if deployment configuration changes.

## 2. Compute the proof locally

Follow the public [proof-of-work specification](https://faucet.sui.io/pow-spec/)
to compute a valid proof for the challenge. Save the four fields listed below as
a JSON object in `proof.json`. Submit promptly: freshness depends on the
checkpoint's age, not when you downloaded the challenge.

## 3. Submit the four fields

`POST /v3/gas` accepts a flat JSON object, not the legacy
`FixedAmountRequest` envelope:

| Field | Required format |
| --- | --- |
| `recipient` | The same normalized recipient address |
| `checkpointSeq` | Challenge checkpoint sequence as a canonical decimal u64 string |
| `nonce` | Winning nonce as a canonical decimal u64 string |
| `hashHex` | All 32 Argon2d output bytes as 64 lowercase hex characters, without `0x` |

Canonical decimal integers have no sign, separators, or leading zeros, except
`"0"`. The largest u64 is `18446744073709551615`. Never convert these values to
JavaScript `Number`.

```sh
curl --fail-with-body "$FAUCET/v3/gas" \
  --header 'Content-Type: application/json' \
  --data-binary @proof.json \
  --output response.json
```

A successful JSON response has `status: "success"`, `digest`, `recipient`,
`amountMist`, and the enforced `difficulty`. Save the response and original
proof, and inspect the transaction on the same network. Check the recipient's
address balance; do not require a new coin object or a legacy `coins_sent` array.

## Recover without requesting a duplicate payout

Branch on the JSON `code`, not just HTTP status. Error responses can also include
`error`, `digest`, and a fresh `challenge`. Keep error bodies even when `curl`
exits nonzero. Do not add blind automatic POST retries.

| Code | HTTP | Action |
| --- | --- | --- |
| `invalid_request` | 400 | Fix missing fields, encoding, or u64 range errors. |
| `insufficient_work` | 400 | Read `requiredDifficulty` and solve to a sufficient threshold. No fresh challenge is attached. |
| `invalid_proof` | 400 | Diagnose the preimage and hash; do not automatically grind another nonce. Compare the client's preimage SHA-256 with `preimageSha256`. |
| `stale_checkpoint` | 409 | If no earlier submission is uncertain, validate the returned challenge or fetch a new one, then solve again. |
| `already_used` | 409 | Inspect its `digest` before another payout. Without a digest, the original request may still be processing. A fresh challenge is not permission to request again. |
| `overloaded` | 503 | Back off with bounded retries. The same proof can be resubmitted while fresh. |
| `funds_unavailable` | 503 | No payout executed. Wait for the operator to refill the faucet; the same proof can be retried while fresh. |
| `not_ready` | 503 | Back off until chain reads recover. |
| `payout_failed` | 502 | With a digest, inspect the definitively failed transaction; the proof remains spent, so use a new challenge for another payout. Without a digest, retry the same proof after recovery while fresh. |
| `payout_status_unknown` | 502 | Resolve the supplied transaction digest to a known outcome before requesting another payout. |
| `internal` or an unknown code | 500 or other | Stop automatic recovery and investigate; do not assume no payout occurred. |

After a timeout, lost response, or gateway failure, retain the original endpoint
and **exact same four request fields**. While the checkpoint remains usable,
resubmitting them can recover a digest through `already_used`. Look up that
transaction before starting new work. If no digest is available, wait and
investigate rather than treating the outcome as a failure.

Replay protection tracks `(checkpointSeq, recipient, nonce)`. It is limited by
checkpoint freshness and server restarts, not a permanent idempotency guarantee.
A later `stale_checkpoint` does not prove an earlier uncertain submission failed.
