# sui-object-model

Deep reference for the Sui object model: ownership types, object abilities, dynamic fields, collections, versioning, transfer patterns, and derived objects. Use this skill when the user needs to understand how to model, store, transfer, or query objects on Sui.

## What this skill covers

| Section | Topics |
|---|---|
| Object structure | ID, version (Lamport timestamps), owner field, transaction digest, BCS format, object reference types (ID / versioned ID / full ref) |
| Defining objects in Move | `key` + `id: UID`, `object::new(ctx)`, `ctx.fresh_object_address()` |
| Move abilities and objects | `key`, `store`, `copy`, `drop` effects on objects, common combinations, structs without `key` (store-only, copy+drop, no abilities / hot potato) |
| Ownership types | Address-owned (fastpath), shared (Mysticeti consensus, read-only optimization), immutable/frozen, wrapped, party objects |
| Transferring objects | Module-restricted vs public (6 core functions), custom transfer rules, `store` tradeoff, transfer-to-object with `Receiving<T>`, `receive` vs `public_receive` |
| Deleting objects | Unpacking pattern, `object::delete(id)`, handling complex fields, dynamic field cleanup warning |
| Dynamic fields | `dynamic_field` vs `dynamic_object_field`, field naming, core API (add/borrow/borrow_mut/remove/exists_), external visibility differences |
| Collections | Table, ObjectTable, Bag, ObjectBag, VecMap, VecSet, LinkedTable — decision table, cleanup requirements, scalability tradeoffs |
| Versioning | Lamport timestamps, fastpath vs consensus versioning, wrapped object and dynamic field version behavior |
| Derived objects | Deterministic IDs, `derived_object::derive_address`, comparison table vs dynamic fields, parallelism, registry patterns |
| Common patterns | Hot potato (no-ability structs), capability pattern (AdminCap/TreasuryCap), soulbound objects, inventory pattern (ObjectBag) |
| System limits | 256 KB object size, 2,048 objects per transaction, 128 KB transaction size |

## Sources

All content is sourced exclusively from:

- [docs.sui.io](https://docs.sui.io)
- [move-book.com](https://move-book.com)

## When to use this skill

Use this skill whenever the user:

- Asks about Sui objects, object ownership (address-owned, shared, immutable, wrapped), or how to choose between them
- Needs to transfer, share, or freeze objects
- Asks about dynamic fields vs dynamic object fields
- Needs to choose between Table, Bag, VecMap, or other collections
- Asks about object versioning, wrapping/unwrapping, or the `Receiving` type
- Wants to implement patterns like hot potato, capability, soulbound, or inventory
- Needs to model data (inventories, registries, nested items) in Sui Move
- Asks about custom transfer rules, Object Display, or derived objects
- Asks about deleting or destroying objects

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | The skill definition (frontmatter + reference content, 434 lines) |
| `evals/evals.json` | 20 evaluation prompts with 114 expectations for testing skill quality |

## Evals

The evals are grounded in real developer questions extracted from a dataset of 2,763 support threads. Each eval targets a high-frequency question category:

| Eval | Topic | Thread signal |
|---|---|---|
| 1 | What is the Sui Object Model | Definitional questions |
| 2 | Ownership types: when to use shared vs owned | 10+ ownership questions |
| 3 | Sharing objects and frontend access by ID | 9 how-to-share questions |
| 4 | Abilities: key/store/copy/drop and transfer permissions | 10+ abilities questions |
| 5 | Dynamic field vs dynamic object field | 8 dynamic field questions |
| 6 | Inventory for arbitrary objects (ObjectBag) | Inventory/equipment pattern questions |
| 7 | Table vs VecMap vs Bag tradeoffs | Collection choice questions |
| 8 | Destroying objects without drop | Object deletion questions |
| 9 | Hot potato pattern | 7 hot potato questions |
| 10 | transfer vs public_transfer | 10 transfer questions |
| 11 | Transfer-to-object and Receiving\<T\> | 3 receiving questions |
| 12 | Soulbound / non-transferable objects | Soulbound questions |
| 13 | Capability pattern (AdminCap, TreasuryCap) | 10 capability questions |
| 14 | Borrow pattern (cap inside object, hot potato receipt) | Borrow pattern questions |
| 15 | Object versioning and Lamport timestamps | Version questions |
| 16 | Wrapped objects and ID accessibility | Wrapping questions |
| 17 | Parallel execution and consensus | Consensus questions |
| 18 | Derived objects vs dynamic fields | From docs |
| 19 | Object Display templates | Display questions |
| 20 | Scalability: 100K-entry governance registry | Table limit questions |

## Related skills

- **sui-fundamentals** — Core reference for what Sui is, the Sui Stack, gas costs, epochs, transactions, and the full development workflow
- **sui-dev-environment** — Complete guide for installing Sui, configuring the CLI, creating Move projects, testing, publishing, and connecting a frontend
