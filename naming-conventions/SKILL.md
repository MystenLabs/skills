---
name: naming-conventions
description: Naming rules for Move smart contracts on Sui - error constants, regular constants, capability structs, events, getters, hot potatoes, and dynamic field keys. Use when the user asks to write, review, or scaffold a Move module or Sui smart contract (AMM, NFT, game, access control, pool, registry), or mentions structs, error codes, capabilities, events, or dynamic fields in Move.
---

# Move on Sui: naming conventions

Apply these to every type, function, and constant you write. They differ from the Rust/Solidity defaults a model tends to produce.

## Error constants: `E` + PascalCase

Never SCREAMING_SNAKE_CASE. Attach a message with `#[error]`; the constant is then `vector<u8>`.

```move
// WRONG
const NOT_AUTHORIZED: u64 = 0;
const INSUFFICIENT_LIQUIDITY: u64 = 1;

// CORRECT
#[error]
const ENotAuthorized: vector<u8> = b"Caller is not authorized to perform this action";
#[error]
const EInsufficientLiquidity: vector<u8> = b"Insufficient liquidity in pool";
```

If the codebase already uses plain `u64` error codes, keep that type but still name them `EPascalCase`.

## Regular constants: ALL_CAPS

```move
// WRONG
const feeNumerator: u64 = 3;

// CORRECT
const FEE_NUMERATOR: u64 = 3;
const FEE_DENOMINATOR: u64 = 1000;
```

## Capability structs: `Cap` suffix

```move
// WRONG
public struct Admin has key, store { id: UID }

// CORRECT
public struct AdminCap has key, store { id: UID }
public struct MintCap has key, store { id: UID }
```

## Events: past tense

```move
// WRONG
public struct CreatePool has copy, drop { pool_id: ID }
public struct LevelUp has copy, drop { new_level: u64 }

// CORRECT
public struct PoolCreated has copy, drop { pool_id: ID }
public struct LiquidityAdded has copy, drop { amount: u64 }
public struct Swapped has copy, drop { amount_in: u64 }
public struct LeveledUp has copy, drop { new_level: u64 }
```

## Getters: field name, no `get_`

```move
// WRONG
public fun get_balance(u: &User): u64 { u.balance }

// CORRECT
public fun balance(u: &User): u64 { u.balance }
public fun details_mut(u: &mut User): &mut Details { &mut u.details }
```

## Hot potato structs: no `Potato` in the name

The absence of abilities already signals the pattern.

```move
// WRONG
public struct FlashLoanPotato {}

// CORRECT
public struct FlashLoanReceipt {}
```

## Dynamic field keys: positional struct, `Key` suffix

```move
// WRONG
public struct ItemSlot has copy, drop, store { name: String }

// CORRECT
public struct InventoryKey(String) has copy, drop, store;
public struct ConfigKey() has copy, drop, store;
```

## Quick reference

| Element | Convention | Example |
|---------|-----------|---------|
| Error constants | `E` + PascalCase, `#[error]` | `ENotAuthorized` |
| Regular constants | ALL_CAPS | `FEE_NUMERATOR` |
| Capabilities | `Cap` suffix | `AdminCap` |
| Events | Past tense | `PoolCreated`, `LeveledUp` |
| Getters | Field name, no `get_` | `balance()` |
| Mutable getters | Field name + `_mut` | `balance_mut()` |
| Hot potatoes | Descriptive, no `Potato` | `FlashLoanReceipt` |
| Dynamic field keys | Positional + `Key` suffix | `InventoryKey(String)` |
