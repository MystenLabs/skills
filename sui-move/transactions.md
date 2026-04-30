# Transactions

A transaction on Sui is a request to read or modify objects. Transactions have the following constraints:

- Maximum size: 128 KB
- Maximum objects per transaction: 2,048
- Transactions must be submitted sequentially from a given address. Simultaneous submissions cause reservation errors because the network reserves objects during processing to prevent conflicts.

## Programmable transaction blocks

Programmable transaction blocks (PTBs) batch multiple commands into a single atomic transaction. This reduces gas costs and guarantees all-or-nothing execution. Within a PTB, you can:

- Call multiple Move functions in sequence.
- Pass the result of one call as input to the next.
- Split, merge, and transfer coins.
- Publish a package and immediately restrict its `UpgradeCap`.
- Transfer created objects to specific addresses.

PTBs are the standard way to compose operations. Virtually every Sui transaction is a PTB, even single-command ones.

## Sponsored transactions

A sponsored transaction is one where a third party (the sponsor) pays the gas fee on behalf of the sender. The sender signs the transaction data; the sponsor signs the gas payment. This enables gasless user experiences where an app backend covers transaction costs.
