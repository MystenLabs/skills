# Assess the transaction the user would sign

## Establish identity and intent

Record the network or chain identifier, sender, gas payer, and the supplied
transaction's encoding. Full `TransactionData` and kind-only bytes are different
inputs: kind-only bytes do not contain the final sender, gas configuration, or
expiration. Use the SDK decoder appropriate to the input; do not guess its format.

For a complete transaction, retain its bytes and SDK-computed transaction digest.
For an incomplete builder, report which fields remain unresolved. Bind the report
to the final resolved transaction when available. A sponsor, wallet, or builder
can change it later; compare the resulting data and reassess affected checks.

Extract only the requested constraints: exact coin type and maximum spend,
minimum output to a named owner, permitted recipient, and maximum gas budget.
Distinguish **net debit** from **gross amount sent** when interpreting a spending
limit. Never equate two assets by symbol, assume stablecoin parity, or infer a
spending allowance from the sender's balance. Use integer base units internally;
use verified decimals only for display.

Sources: [transaction construction](https://sdk.mystenlabs.com/sui/transactions/basics),
[offline construction](https://sdk.mystenlabs.com/sui/transactions/offline),
[signing](https://sdk.mystenlabs.com/sui/transactions/signing-and-execution).

## Obtain meaningful simulation evidence

Use `simulateTransaction` on the project's configured gRPC or GraphQL client.
For a transport-independent library, use `client.core.simulateTransaction`.
Request effects, balance changes, and transaction data; request command results
only when their decoded values help answer the question. Check the installed
SDK's response union and execution status rather than assuming an HTTP success
means a successful Move execution.

Keep `checksEnabled` true. A run with validation disabled is useful for inspecting
code, but cannot establish ordinary transaction eligibility.

Check `gasPaymentMocked`. Mocked gas can also fund amounts taken from `GasCoin`:
a simulated SUI transfer can succeed even though the real payer cannot fund it.
In that case label affordability and affected spending evidence **unknown**.
Use supported real-gas selection or explicit real payment inputs for a follow-up
simulation; retain the payer and the resolved payment mode in the report.
Do not assume an empty gas-payment list proves either missing funds or real
address-balance funding. Verify what the endpoint actually simulated. Even real
funding in a simulation does not reserve that funding against concurrent spending.

Record the endpoint identity without credentials, observation time, and returned
epoch, checkpoint, or object versions where available. A separately queried
latest checkpoint is context, not proof the simulation ran at that checkpoint.
If the API does not pin a snapshot, describe it as an unpinned latest-state run.

Sources: [simulation and include options](https://sdk.mystenlabs.com/sui/clients/executing),
[portable Core API](https://sdk.mystenlabs.com/sui/clients/core),
[PTB GasCoin semantics](https://docs.sui.io/develop/transactions/ptbs/prog-txn-blocks).

## Compare effects with constraints

| Question | Evidence and limitation |
|----------|-------------------------|
| Does the intended recipient get the intended asset? | Check its exact coin type, amount, and owner. Inspect object transfers as well as coin deltas. |
| Is the sender's net debit within the cap? | Aggregate deltas only for that sender and exact asset. Keep the gas payer's SUI fee separate where the effects permit reconciliation. |
| Is gross spending or every recipient restricted? | Net deltas can hide intermediate outgoing and incoming flows. Inspect commands and supported call semantics; otherwise report unknown. |
| Is the swap output above the minimum? | Check the destination owner's simulated output, then separately inspect the actual Move-call minimum-output argument or equivalent on-chain guard. A quote alone is not a guard. |
| Does the transaction create obligations or change permissions? | Review object changes and call semantics. A positive balance delta could be borrowed funds, not profit; a capability transfer can matter without a coin debit. |

For each check, cite the relevant command, decoded argument, or effect. If events
or object data are incomplete, identify the missing evidence. Do not upgrade an
unknown check to satisfied merely because the other checks passed.

A newer oracle or pool version can change the economics even if the program bytes
are unchanged. Report which claims need fresh state and which limits are enforced
by the transaction itself. Simulation does not reserve shared-object ordering,
liquidity, or owned inputs, and cannot guarantee inclusion or success.

Sources: [PTB commands and atomic effects](https://docs.sui.io/develop/transactions/ptbs/prog-txn-blocks),
[transaction queries](https://sdk.mystenlabs.com/sui/clients/querying),
[object-based fee markets](https://docs.sui.io/develop/transaction-payment/local-fee-markets).

## Explain gas without mixing units

Report gas **price** in MIST per computation unit and gas **budget** in MIST.
`setGasBudget` is a monetary cap, not a count of units; do not multiply it by the
gas price again. Separate measured computation cost, storage cost, storage rebate,
and estimated net fee. A large rebate does not eliminate up-front funding or
computation-budget requirements. Do not add a reported non-refundable storage
fee again if it is already included in the reported storage accounting.

Budget sufficiency and the user's maximum fee exposure are separate checks.
A simulated net fee below the user's cap does not make a larger signed budget
acceptable. Repricing can also change gas sufficiency and program behavior:
assess the final price and budget rather than copying a result from another bid.
Use current network limits and the project's stated margin; do not invent a
universal multiplier or promise that a higher bid guarantees faster execution.

Sources: [gas accounting and budgets](https://docs.sui.io/develop/transaction-payment/gas-in-sui),
[PTB gas withdrawal](https://docs.sui.io/develop/transactions/ptbs/prog-txn-blocks).

## Return a concise report

Lead with the action and the result of the requested checks. Include:

- Transaction identity, network, sender and gas payer; unresolved fields if any.
- Simulation success or failure, validation mode, and mocked-funding status.
- Checks with their three-way verdicts and supporting evidence.
- Estimated fee and signed maximum budget, both with units.
- State context, missing evidence, and the smallest useful next action.

For example: “The simulation returns 12.4 USDC to your address, above your 12 USDC
minimum. The call has no verified minimum-output guard, so that amount is not
protected against a price change. Funding remains unknown because gas was mocked.”

This report is evidence for the caller's decision, not a signature, an execution
receipt, or a claim that an arbitrary program is safe.
