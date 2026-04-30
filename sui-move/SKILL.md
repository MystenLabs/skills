---
name: sui-move
description: >
  Sui Move smart contract development. Use when writing, reviewing, or debugging
  Move code on Sui. Covers object model and ownership, abilities (key, store, copy,
  drop), TxContext, init functions, One-Time Witness, package publishing and upgrades,
  resource safety, dynamic fields, collections, events, coins, Object Display,
  programmable transaction blocks (PTBs), sponsored transactions, and the Clock
  object. Also use when the user asks about struct abilities, UID, transfer vs
  public_transfer, shared vs owned objects, or how to destroy objects.
---

# Sui Move

> **Source constraint:** All information in this skill is sourced exclusively from [docs.sui.io](https://docs.sui.io) and [move-book.com](https://move-book.com). When extending or updating this skill, only pull from these sources. Do not use third-party blogs, tutorials, or unofficial documentation.

Move is Sui's smart contract language, designed around resource safety and an object-centric data model. This skill covers everything needed to write correct Move code on Sui: the object model, the type system, standard library types, and transaction composition.

This skill routes to focused reference files. Load only the ones relevant to the current task.

---

## Reference files

### objects — Object Model and Ownership
**Path:** `objects.md`
**Load when:** working with object ownership (address-owned, shared, immutable, wrapped), designing data models, choosing between shared and owned objects, or understanding parallel execution trade-offs.
**Covers:** object states and versioning, the four ownership types, `transfer` vs `public_transfer`, Mysticeti consensus, shared object access mode optimization.

### move — Move Language Fundamentals
**Path:** `move.md`
**Load when:** writing Move code, working with abilities, TxContext, time/Clock, init functions, One-Time Witness, packages, modules, structs, or resource safety.
**Covers:** the four abilities and common combinations, TxContext methods, Clock object, init functions, OTW pattern, packages and upgrades, modules, structs, resource safety and object destruction, a worked Greeting example.

### stdlib — Standard Library Types
**Path:** `stdlib.md`
**Load when:** using dynamic fields, collections (`Table`, `Bag`, `VecMap`, etc.), events, coins, or Object Display.
**Covers:** dynamic fields vs dynamic object fields, all collection types with trade-offs, event emission, coin operations, Object Display templates.

### transactions — Transactions
**Path:** `transactions.md`
**Load when:** composing transactions, building PTBs, or implementing sponsored transactions.
**Covers:** transaction constraints, programmable transaction blocks (PTBs), sponsored transactions.

---

## Routing guide

| Task | Load |
|------|------|
| Designing an object data model | objects |
| Choosing shared vs owned objects | objects |
| Writing a Move struct with abilities | move |
| Using TxContext or the Clock object | move |
| Writing an init function or OTW | move |
| Publishing or upgrading a package | move |
| Destroying an object without drop | move |
| Using dynamic fields or collections | stdlib |
| Emitting or subscribing to events | stdlib |
| Creating a fungible token | move + stdlib |
| Setting up Object Display | stdlib |
| Building a PTB | transactions |
| Implementing sponsored transactions | transactions |
| Writing a complete smart contract | objects + move + stdlib |
| Code review | **all reference files** |

---

## Rules

- Always use `object::new(ctx)` to create UIDs. There is no other way.
- Use `public_transfer` (not `transfer`) when the object has `store` and the call originates outside the defining module.
- Shared objects cannot be unshared. Design ownership carefully before calling `share_object`.
- Prefer immutable references (`&`) on shared objects to maximize parallel execution.
- Event structs must have `copy` and `drop` abilities.
- No `as` casts on numeric types. Use `from`/`into` or `try_from`/`try_into`.
- To destroy an object without `drop`, unpack the struct and call `object::delete(id)` on the UID.

## Common mistakes

- **Confusing `transfer` with `public_transfer`.** The non-public variant only works within the defining module. Calling it from another module is a compile error.
- **Forgetting to delete the UID.** When destroying an object, you must call `object::delete(id)` on the UID field.
- **Assuming `ctx.epoch_timestamp_ms()` is precise.** It returns the epoch start time. Use the Clock object (`0x6`) for real-time timestamps.
- **Using `VecMap` for large collections.** It has O(n) lookup and does not scale past ~100 entries. Use `Table` instead.
- **Submitting concurrent transactions from the same address.** Sui serializes per-address submissions. Concurrent sends cause reservation errors.
