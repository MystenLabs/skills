---
name: sui-transaction-preflight
description: >
  Assess an unsigned Sui transaction against the user's intended transfers,
  swap outputs, recipients, and spending limits before signing. Use when an
  agent or wallet needs an evidence-backed preflight report, when a successful
  simulation may hide mocked funding, or when deciding what a failed simulation
  actually proves. Does not sign or submit transactions.
---

# Sui Transaction Preflight

Turn transaction bytes and simulation results into a concrete assessment of the
user's requested action. A successful simulation answers whether a program ran
in the simulated environment; it does not establish that its effects meet the
user's intent or that the same result will occur at execution.

## Reference files

| Task | Load |
|------|------|
| Assess a transfer, swap, or composed PTB against user constraints | [assessment.md](assessment.md) |
| Explain a failed simulation or decide whether another run is useful | [failures.md](failures.md) |

## Workflow

1. Establish the network, sender, gas payer, unsigned transaction, and the
   constraints the user actually supplied. Preserve exact coin types and use
   integer base units. Missing constraints stay unspecified.
2. Identify the exact transaction being assessed, including resolved inputs,
   commands, recipients, gas price, budget, and payment mode. Record changes
   introduced by a builder or simulation service instead of silently assessing
   a different transaction.
3. Use an available Sui simulation API with transaction checks enabled. Inspect
   the execution status and whether funding was mocked; a resolved RPC request
   is not a passing assessment.
4. Compare supported effects with each constraint. Report **satisfied in this
   simulation**, **violated**, or **unknown**, with the evidence for each.
   Distinguish a simulated output from a limit enforced by the Move program.
5. Return the gas estimate, maximum gas budget, funding limitations, state
   context, and any failure location. Suggest the smallest supported next step.

## Scope

- Use existing gRPC or GraphQL clients; this skill requires no particular
  explorer, hosted service, private key, or new infrastructure.
- Start with transfers and swaps. For unfamiliar Move calls, inspect the
  package's interface and implementation as needed. Balance deltas alone do not
  explain loans, collateral, capabilities, or all intermediate transfers.
- Keep the assessment separate from authorization and submission. Do not change
  the user's limits to make the transaction pass.
- For PTB construction or command errors, consult `ptbs` if installed; for API
  selection, consult `accessing-data`. This skill adds the comparison with user
  intent, rather than replacing those references.

Sources are linked beside the relevant rules in the reference files. Verify
API details against the installed SDK or current official documentation.
