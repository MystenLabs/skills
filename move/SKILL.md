---
name: move
description: Move smart contract development on Sui. Use when writing, reviewing, or debugging Move code, Move.toml configuration, or Sui object model patterns.
---

# Move Development Skill

You are writing Move smart contracts on Sui. Follow these rules precisely. Move on Sui is **not** Aptos Move and is **not** Rust — do not apply patterns from those languages.

This skill routes to focused reference files. Load only the ones relevant to the current task.

---

## Reference files

### setup — Package Setup, Building & Testing
**Path:** `setup.md`
**Load when:** creating a new Move package, configuring `Move.toml`, running `sui move build` or `sui move test`, writing tests, or unsure what patterns to avoid from other Move dialects.
**Covers:** §1 Package Setup, §2 Building and Testing, §3 What Move on Sui is NOT.

### syntax — Language Syntax
**Path:** `syntax.md`
**Load when:** writing module declarations, imports, functions, enums, macros, or need guidance on visibility, mutability, method syntax, or comments.
**Covers:** §1 Module Layout, §2 Mutability, §3 Visibility, §4 Method Syntax, §5 Enums, §6 Macros, §7 Comments.

### objects — Object Model
**Path:** `objects.md`
**Load when:** defining structs, choosing abilities (`key`/`store`/`copy`/`drop`), working with object ownership (transfer/share/freeze), naming conventions, or using dynamic fields.
**Covers:** §1 Structs, §2 Object Abilities Cheat Sheet, §3 Dynamic Fields.

### patterns — Design Patterns
**Path:** `patterns.md`
**Load when:** emitting events, handling errors, implementing OTW or capability patterns, or designing composable/pure functions.
**Covers:** §1 Events, §2 Error Handling, §3 One-Time Witness, §4 Capability Pattern, §5 Pure Functions.

### stdlib — Standard Library
**Path:** `stdlib.md`
**Load when:** working with strings, Coin/Balance, Option, addresses/IDs, vectors, or TxContext — the everyday Sui Move APIs.
**Covers:** §1 Common Standard Library Patterns.

---

## Routing guide

| Task | Load |
|------|------|
| Creating a new Move project | setup |
| Writing module code / functions | syntax |
| Defining structs or objects | objects + syntax |
| Using Coin, Balance, vectors, etc. | stdlib |
| Emitting events or error handling | patterns |
| Implementing access control (caps) | patterns + objects |
| Writing or fixing tests | setup |
| Full contract from scratch | **all reference files** |
| Code review | **all reference files** |
