# sui-fundamentals

Core reference skill for what Sui is, how the Sui Stack works, and how its components fit together. This skill provides foundational context that other Sui developer skills depend on.

## What this skill covers

| Section | Topics |
|---|---|
| The object-centric model | Object states, ownership types (address-owned, shared, immutable, wrapped), Mysticeti consensus, parallel execution, shared object access mode optimization |
| Move abilities | `key`, `store`, `copy`, `drop` — what each controls, common combinations, compile-time enforcement |
| TxContext | `ctx.sender()`, `ctx.epoch()`, `ctx.epoch_timestamp_ms()`, `object::new(ctx)` |
| Init functions and One-Time Witness | Module `init` lifecycle, OTW struct rules, `coin::create_currency` |
| Sui addresses and accounts | 32-byte identifiers, key pairs, recovery phrases, keystore, aliases |
| The Sui CLI | `suiup` installation, `client.yaml` config, essential commands |
| Sui networks | Mainnet, Testnet, Devnet, Localnet — gas cost model (computation + storage - rebate), epochs |
| Move language | Packages, modules, structs, resource safety, dynamic fields, collections (Table, Bag, VecMap, LinkedTable), events, coin operations, Object Display |
| Transactions | Constraints, programmable transaction blocks (PTBs), sponsored transactions |
| Frontend integration | Sui dApp Kit, TypeScript SDK, wallet connection, Clock object |
| The Sui Stack | Randomness, zkLogin, Walrus, Nautilus, DeepBook, Kiosk |
| Use cases | DeFi, gaming, NFTs, identity, social, supply chain |
| How components work together | Five-layer development workflow from Move contracts through frontend and Stack primitives |

## Sources

All content is sourced exclusively from:

- [docs.sui.io](https://docs.sui.io)
- [move-book.com](https://move-book.com)

## When to use this skill

Use this skill whenever the user:

- Has questions about what Sui is, what the Sui Stack contains, and different use cases
- Is building on Sui or writing Move smart contracts
- Asks about Sui objects, ownership, abilities, or transactions
- Needs to understand TxContext, dynamic fields, package upgrades, coin operations, PTBs, gas costs, epochs, events, Object Display, sponsored transactions, One-Time Witness, or init functions
- Is integrating Sui into a frontend or explaining Sui concepts
- Is migrating from Ethereum or Solana to Sui

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | The skill definition (frontmatter + reference content, 473 lines) |
| `evals/evals.json` | 20 evaluation prompts with 123 expectations for testing skill quality |

## Evals

The evals are grounded in real developer questions extracted from a dataset of 2,763 support threads. Each eval targets a high-frequency question category:

| Eval | Topic | Thread signal |
|---|---|---|
| 1 | Object model and ownership | 219 questions |
| 2 | Move abilities (key/store/copy/drop) | 74 questions |
| 3 | Programmable transaction blocks | 66 questions |
| 4 | Gas cost formula and storage rebate | 42 questions |
| 5 | Package upgrades and UpgradeCap | 45 questions |
| 6 | Init function and One-Time Witness | 13 questions |
| 7 | TxContext, epoch, Clock differences | 125 questions |
| 8 | Collections: Table vs VecMap vs Bag | 100 questions |
| 9 | Shared object consensus and parallelism | 105 questions |
| 10 | Events (emit, subscribe) | 21 questions |
| 11 | Coin/currency operations | 75 questions |
| 12 | Object Display templates | 9 questions |
| 13 | Sponsored transactions | 6 questions |
| 14 | Dynamic fields vs dynamic object fields | 26 questions |
| 15 | Parallel execution and Mysticeti | 20 questions |
| 16 | Epoch mechanics and boundary | 49 questions |
| 17 | Frontend and dApp Kit integration | 15 questions |
| 18 | Ethereum-to-Sui migration | 53 questions |
| 19 | Destroying objects without drop | 74 questions |
| 20 | Sui Stack components and composition | 143 questions |

## Related skills

- **sui-object-model** — Deep reference for ownership types, dynamic fields, collections, transfer patterns, versioning, and derived objects
- **sui-dev-environment** — Complete guide for installing Sui, configuring the CLI, creating Move projects, testing, publishing, and connecting a frontend
