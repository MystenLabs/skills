# Interpret failures before proposing a retry

Separate a transport failure, input-validation rejection, Move abort, and gas
exhaustion. They need different remedies. An RPC timeout without an execution
result proves neither success nor failure; a simulation timeout is not a Move
abort. A known executed transaction's recorded effects take precedence over a
new simulation against different state.

| Evidence | Next useful action |
|----------|--------------------|
| RPC unavailable, rate limit, or timeout | Report the missing result; retry the read or simulation with bounded backoff within the caller's deadline. |
| Missing or stale owned-object reference | Identify the object, check the sender's current ownership/version, and rebuild affected inputs. A missing historical version might be pruned, not nonexistent. |
| Shared-object congestion or changed state | State the observed condition. Refresh state and the economic checks; do not claim that increasing price guarantees inclusion. |
| Move abort | Preserve package, module, abort code, command index, and function location if present. Resolve the meaning against that package version's source or bytecode. |
| Insufficient balance during a split | Follow the failing command's actual input/result chain. A short flash repayment or swap output is not fixed by increasing the gas budget. |
| Gas exhaustion | Check the actual price, monetary budget, payer funding, and measured path. Any revised budget must remain within the user's cap and be reassessed. |
| Failed transaction with recorded effects | Report the recorded gas charge and failure. Do not count intermediate command results as completed transfers or earned profit. |

Command indexes are zero-based when reported as PTB indexes: index 2 means the
third command. If an explorer uses human numbering, state the conversion. Do not
infer the failing high-level action solely from an internal helper's name.

An abort code is scoped to its package/module, not a universal error number.
If the relevant code or input is unavailable, state what is established and what
remains a hypothesis. Preserve the user's recipients, amounts, slippage bounds,
and gas cap when proposing a repair; do not remove a failing assertion merely to
obtain a passing simulation.

This is a diagnostic workflow. It does not submit, rebuild-and-send, or repeatedly
raise bids. If the user separately requests execution, use the existing signing
workflow with the final transaction and the applicable authorization.

Sources: [Sui transaction errors](https://docs.sui.io/develop/testing-debugging/common-errors),
[execution status and simulation](https://sdk.mystenlabs.com/sui/clients/executing),
[PTB execution semantics](https://docs.sui.io/develop/transactions/ptbs/prog-txn-blocks),
[gas failure charging](https://docs.sui.io/develop/transaction-payment/gas-in-sui).
