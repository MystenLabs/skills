---
name: sui-overview
description: >
  High-level overview of what Sui is, how it works, and what the Sui Stack provides.
  Use when explaining Sui to someone new, comparing Sui to other blockchains
  (Ethereum, Solana, Bitcoin), discussing the object-centric data model at a
  conceptual level, choosing which Sui Stack primitives to use (randomness, zkLogin,
  Walrus, Nautilus, DeepBook, Kiosk), or exploring what use cases Sui enables (DeFi,
  gaming, NFTs, identity, social, supply chain). Also use when migrating from
  Ethereum or Solana to Sui.
---

# Sui Overview

> **Source constraint:** All information in this skill is sourced exclusively from [docs.sui.io](https://docs.sui.io), [docs.wal.app](https://docs.wal.app), and [move-book.com](https://move-book.com). When extending or updating this skill, only pull from these three sources. Do not use third-party blogs, tutorials, or unofficial documentation.

Sui is a scalable, performant layer 1 blockchain built around an object-centric data model. Unlike account-based blockchains (Ethereum) or UTXO-based chains (Bitcoin), Sui treats every piece of onchain state as a typed object with a unique ID. Transactions consume objects as inputs and produce modified versions as outputs.

This skill covers the conceptual foundation of Sui and the broader Sui Stack. For implementation details, see the `sui-move`, `sui-frontend`, and `sui-cli` skills.

---

## Reference files

### ecosystem — Sui Stack and Ecosystem
**Path:** `ecosystem.md`
**Load when:** the user asks about Sui Stack primitives (randomness, zkLogin, Walrus, Nautilus, DeepBook, Kiosk), use cases, or how components fit together in an end-to-end workflow.
**Covers:** all Sui Stack primitives, use cases (DeFi, gaming, NFTs, identity, social, supply chain), the layered development workflow.

---

## Routing guide

| Task | Load |
|------|------|
| Explaining what Sui is | SKILL.md only |
| Comparing Sui to Ethereum or Solana | SKILL.md only |
| Choosing Sui Stack primitives | ecosystem |
| Understanding Sui use cases | ecosystem |
| Planning an app architecture on Sui | ecosystem |

---

## The object-centric model

Every item on the Sui network is an object with a unique ID and a version number. When a transaction modifies an object, it produces a new version with an incremented version number while preserving the original ID.

Objects have one of four ownership types:

- **Address-owned:** Only the owning address can use the object. Enables parallel execution without consensus.
- **Shared:** Any address can use the object. Requires consensus ordering through Mysticeti.
- **Immutable (frozen):** Anyone can read it, no one can mutate it. Permanent and irreversible.
- **Wrapped:** Stored inside another object's fields. Accessible only through the parent.

This ownership model is what enables Sui's parallel execution: transactions on non-overlapping owned objects execute in parallel without consensus. Only shared-object transactions go through Mysticeti consensus ordering.

## Move and resource safety

Sui uses the Move programming language for smart contracts. Move enforces resource safety at compile time: objects cannot be duplicated or silently dropped. This differs from Ethereum, where the EVM prices operations through gas to prevent abuse. In Move, invalid resource handling is a compilation error, not a runtime cost.

## Programmable transaction blocks

Programmable transaction blocks (PTBs) batch multiple commands into a single atomic transaction. You can call multiple Move functions, pass results between them, split and merge coins, and transfer objects, all in one transaction. This composability replaces the need for multi-transaction workflows common on other chains.

## Key differences from Ethereum

| Concept | Ethereum | Sui |
|---------|----------|-----|
| Data model | Account-based with contract storage mappings | Object-centric with typed, owned objects |
| Smart contract language | Solidity (EVM bytecode) | Move (compile-time resource safety) |
| State storage | Shared global state in contract storage slots | Individual objects with unique IDs and ownership |
| Transaction composition | Separate transactions or internal calls | PTBs batch multiple operations atomically |
| Parallel execution | Sequential execution of all transactions | Parallel execution of owned-object transactions |
| Safety model | Gas-based runtime abuse prevention | Compile-time resource safety guarantees |

## Rules

- Always frame Sui explanations around the object-centric model. It is the foundational concept.
- When comparing to Ethereum, emphasize the shift from shared-state contracts to individually owned objects.
- Do not describe Sui as "just another EVM chain." The programming model is fundamentally different.
- The Sui Stack components (Walrus, zkLogin, DeepBook, Kiosk, and others) are native primitives, not third-party add-ons.
