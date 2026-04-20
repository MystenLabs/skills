---
name: sui-object-model
description: >
  Deep reference for the Sui object model: ownership types, object abilities,
  dynamic fields, collections, versioning, transfer patterns, and derived objects.
  Use this skill whenever the user asks about Sui objects, object ownership
  (address-owned, shared, immutable, wrapped), how to transfer or share or freeze
  objects, dynamic fields vs dynamic object fields, Table vs Bag vs VecMap,
  object versioning, wrapping and unwrapping, the Receiving type, custom transfer
  rules, hot potato pattern, capability pattern, object deletion, Object Display,
  or how to model data (inventories, registries, nested items) in Sui Move. Also
  use when the user needs to choose between ownership types or storage patterns
  for their use case.
---

# Sui Object Model

> **Source constraint:** All information in this skill is sourced exclusively from [docs.sui.io](https://docs.sui.io) and [move-book.com](https://move-book.com). When extending or updating this skill, only pull from these two sources. Do not use third-party blogs, tutorials, or unofficial documentation.

Objects are the fundamental unit of storage on Sui. Every resource, asset, and piece of data onchain is an object. Unlike account-based blockchains where state lives in shared mappings inside contracts, Sui gives each piece of state its own identity, version, and owner.

## Object structure

Every Sui object contains four components:

- **Globally unique ID:** A 32-byte identifier derived from the creation transaction digest plus a generation counter. The ID never changes across the object's lifetime.
- **Version number:** An 8-byte integer that increments with each modification. Uses Lamport timestamps: the new version for all objects a transaction touches is `1 + max(version of all input objects)`.
- **Owner field:** A 32-byte value designating access control (an address, another object's ID, or a sentinel for shared/immutable).
- **Transaction digest:** A 32-byte hash referencing the last transaction that modified the object.

Objects are stored in Binary Canonical Serialization (BCS) format. Move objects additionally store type information and field data. Move packages store bytecode modules, type origin tables, and linkage tables.

### Object references

Objects can be referenced three ways:

| Reference type | Contains | Use case |
|---|---|---|
| ID | The 32-byte object ID | Query current object state |
| Versioned ID | ID + version | Read historical state at a specific point |
| Object reference | ID + version + digest | Transaction inputs (authenticated snapshot) |

Transaction inputs require full object references (ID + version + digest) to guarantee the transaction operates on the exact state the sender intended.

## Defining objects in Move

A Sui object is a Move struct with the `key` ability and an `id: UID` as the first field:

```move
public struct Sword has key, store {
    id: UID,
    damage: u64,
    element: String,
}
```

Create a new object by generating a UID from `TxContext`:

```move
public fun forge_sword(ctx: &mut TxContext): Sword {
    Sword {
        id: object::new(ctx),  // only way to create a UID
        damage: 100,
        element: b"fire".to_string(),
    }
}
```

`object::new(ctx)` is the only way to create a `UID`. You cannot call `ctx.new()` directly. For generating an address without creating a full UID, use `ctx.fresh_object_address()`, but this is rare and does not create an object.

## Move abilities and objects

Abilities control what you can do with a struct. For objects, the critical abilities are:

| Ability | What it controls | Effect on objects |
|---|---|---|
| `key` | The struct is a Sui object. Must have `id: UID` as first field. | Required for all onchain objects. |
| `store` | The struct can be stored inside other objects, and transferred by any module using `public_transfer`. | Without it, only the defining module can transfer the object. Adding `store` permanently removes the ability to enforce custom transfer rules. |
| `copy` | The struct can be duplicated. | Rarely used on objects. Used for configs, event data, or read-only values. |
| `drop` | The struct can be silently discarded at end of scope. | Rarely used on objects. Useful for ephemeral receipts. Objects without `drop` must be explicitly unpacked to destroy. |

### Common ability combinations for objects

- **`has key`:** The object can only be transferred, shared, or frozen by its defining module. Use for objects that need custom transfer rules or access control.
- **`has key, store`:** The object can be transferred, shared, frozen, or wrapped by any module. Use for freely composable assets like coins, NFTs, and general-purpose items. Once `store` is granted, you cannot re-add custom transfer restrictions.
- **`has key, store, drop`:** Rare. The object can be silently discarded. Use for temporary or disposable items.

### Structs without `key`

A struct without `key` is not a Sui object. It has no onchain identity and cannot exist independently.

- **`has store`:** Can be stored as a field inside an object, or as a dynamic field value. Cannot be transferred on its own.
- **`has copy, drop`:** A plain data struct. Used for events (which require both `copy` and `drop`), intermediate values, and config data.
- **`has copy, drop, store`:** Can be used as dynamic field names (which require `copy`, `drop`, and `store`).
- **No abilities:** A hot potato. Cannot be stored, copied, or dropped. Must be consumed by a function in the same transaction. See "Hot potato pattern" below.

## Ownership types

Every object on Sui has exactly one of five ownership types:

### Address-owned objects

Owned by a specific 32-byte address. Only that address can use the object as a transaction input. Created through `transfer::transfer()` or `transfer::public_transfer()`.

Address-owned objects skip consensus entirely (fastpath). This gives them the lowest latency and highest throughput. Most transactions on Sui (transfers, personal asset management, single-player game moves) touch only owned objects and execute in parallel.

The tradeoff: only one address can use the object. If multiple users need access, use a shared object instead.

### Shared objects

Accessible to any address on the network. Created through `transfer::share_object()` or `transfer::public_share_object()`. Once shared, an object cannot be unshared or converted back to address-owned.

Shared objects require consensus ordering through Mysticeti. This adds latency and gas cost compared to owned objects. Use shared objects when multiple users or modules need to read or write the same state (registries, pools, marketplaces, shared game state).

**Access mode optimization:** When a function takes a shared object by immutable reference (`&`), the system marks it as `mutable: false` and can schedule multiple read-only transactions on that shared object in parallel. When taken by mutable reference (`&mut`) or by value, the system marks it as `mutable: true` and consensus must sequence those transactions. Prefer immutable references on shared objects whenever mutation is not needed.

### Immutable (frozen) objects

Cannot be changed, transferred, or deleted. Anyone can read them. Created through `transfer::freeze_object()` or `transfer::public_freeze_object()`. Freezing is permanent and irreversible.

Immutable objects skip consensus (like owned objects). Use for reference data, published packages, and constants that never change.

### Wrapped objects

An object stored as a field inside another object. Wrapped objects are not directly accessible by ID; they can only be reached through their parent. While wrapped, the object cannot be passed as a transaction input, even if you know its ID.

When unwrapped, the object regains direct access and retains its original ID.

Wrapping requires the child object to have the `store` ability (so it can be stored inside the parent). Wrapping and unwrapping can happen within the same transaction.

Use wrapping for tight coupling: when a child should only be accessible through its parent (equipment inside a character, items inside a chest).

### Party objects

Owned by a specified party at transfer time and versioned by consensus. Combines ownership assignment with consensus-based versioning. Used for specialized multi-party coordination.

## Transferring objects

The `transfer` module provides six core functions in two tiers:

### Module-restricted (no `store` required)

These can only be called from the module that defines the object's type:

| Function | Effect |
|---|---|
| `transfer::transfer(obj, recipient)` | Transfer to an address |
| `transfer::share_object(obj)` | Make the object shared |
| `transfer::freeze_object(obj)` | Make the object immutable |

### Public (requires `store`)

These can be called from any module, but the object must have the `store` ability:

| Function | Effect |
|---|---|
| `transfer::public_transfer(obj, recipient)` | Transfer to an address or object ID |
| `transfer::public_share_object(obj)` | Make the object shared |
| `transfer::public_freeze_object(obj)` | Make the object immutable |

### Custom transfer rules

Objects without `store` can only be transferred by their defining module. This lets you enforce preconditions:

```move
public struct LockedItem has key {
    id: UID,
    unlocked: bool,
}

public fun transfer_if_unlocked(item: LockedItem, to: address) {
    assert!(item.unlocked, EItemLocked);
    transfer::transfer(item, to);
}
```

Once you add `store` to an object, you permanently give up the ability to enforce custom transfer rules. Anyone can call `public_transfer` on it.

### Transfer to object (Receiving)

Objects can be transferred to other object IDs, not just addresses. Sui treats 32-byte addresses and 32-byte object IDs identically for transfer purposes.

```move
// Transfer object `sword` to the object with ID 0x0B (e.g., a character)
transfer::public_transfer(sword, @0x0B);
```

The receiving object must explicitly accept sent objects using the `Receiving<T>` type:

```move
public fun accept_item<T: key + store>(
    parent: &mut UID,
    sent: Receiving<T>,
): T {
    transfer::public_receive(parent, sent)
}
```

Key rules:

- `transfer::receive(parent_uid, receiving)` works for objects defined in the current module (no `store` required on child).
- `transfer::public_receive(parent_uid, receiving)` works for any object with `key + store`.
- Requires mutable access to the parent's `UID`, which enforces access control.
- `Receiving<T>` has only `drop`, so you can choose to receive some, none, or all objects sent to a parent.

## Deleting objects

Objects without `drop` must be explicitly unpacked. The UID must be deleted with `object::delete()`:

```move
public struct Character has key {
    id: UID,
    name: String,
}

public fun destroy_character(character: Character) {
    let Character { id, name: _ } = character;
    id.delete();
}
```

For objects with complex fields (like `LinkedTable`), you must handle each field: drop it if it has `drop`, destroy it if it has a `destroy_empty` method, or recursively unpack it.

A shared object can be destroyed if a function takes it by value and deletes it within the same transaction.

**Deleting objects with dynamic fields defined on them renders those fields permanently inaccessible.** Always remove all dynamic fields before deleting the parent.

## Dynamic fields

Dynamic fields attach key-value data to an object at runtime, beyond the fields declared in the struct. They are added and removed on the fly and only affect gas when accessed.

### Two types

| Type | Module | Value requirement | External visibility |
|---|---|---|---|
| Dynamic field | `sui::dynamic_field` | Any type with `store` | Wrapped: not visible to explorers or wallets by ID |
| Dynamic object field | `sui::dynamic_object_field` | Must be an object (`key + store`) | Child retains its own ID, visible to explorers and wallets |

**When to use dynamic object field:** When the stored value is an object that should remain independently queryable (for example, an NFT inside an inventory that you want to look up by its ID). Use this when you need "my player NFT needs an inventory that supports any arbitrary Sui object."

**When to use dynamic field:** When the stored value is a plain type (like `u64`, `String`, or a non-object struct), or when you do not need the child to be independently addressable.

### Field naming

Dynamic field names accept any value with `copy`, `drop`, and `store` abilities. This includes primitives (`u64`, `address`, `String`) and custom structs with those abilities. This is more flexible than regular struct fields, which require Move identifiers.

### Core API

Both modules share the same API shape:

```move
// Add a field
dynamic_field::add(&mut parent.id, name, value);

// Read a field (immutable)
let val: &V = dynamic_field::borrow(&parent.id, name);

// Read a field (mutable)
let val: &mut V = dynamic_field::borrow_mut(&mut parent.id, name);

// Remove a field (returns the value)
let val: V = dynamic_field::remove(&mut parent.id, name);

// Check existence
let exists: bool = dynamic_field::exists_(&parent.id, name);
```

Replace `dynamic_field` with `dynamic_object_field` for object fields. The API is identical.

Accessing a nonexistent field aborts the transaction. Adding a field with a name that already exists (same name and type) also aborts.

## Collections

Sui provides collection types built on top of dynamic fields:

### Table and ObjectTable

`Table<K, V>` is a homogeneous key-value map backed by dynamic fields. O(1) lookup. The default choice for large or unbounded collections.

`ObjectTable<K, V>` is the same but values must be objects (`key + store`). Child objects keep their own IDs and are visible to explorers.

```move
let mut inventory = table::new<String, Sword>(ctx);
table::add(&mut inventory, b"excalibur".to_string(), sword);
let sword_ref: &Sword = table::borrow(&inventory, b"excalibur".to_string());
```

### Bag and ObjectBag

`Bag` is a heterogeneous map: keys and values can be different types across entries. Use when you need to store mixed types under one parent (for example, an inventory that holds Swords, Shields, and Potions all in one collection).

`ObjectBag` is the same but values must be objects.

```move
let mut bag = bag::new(ctx);
bag::add(&mut bag, b"weapon".to_string(), sword);   // Sword type
bag::add(&mut bag, b"shield".to_string(), shield);   // Shield type
```

### VecMap and VecSet

`VecMap<K, V>` is a vector-backed map with O(n) lookup. Stored inline on the object (no dynamic fields). Cheaper per entry but does not scale past ~100 entries. Use for small, bounded collections where you know the maximum size.

`VecSet<K>` is a vector-backed set. Same tradeoffs.

### LinkedTable

`LinkedTable<K, V>` is a doubly-linked map that preserves insertion order and supports ordered iteration. Use when you need to traverse entries in order or pop from front/back.

### Collection cleanup

Collections lack the `drop` ability. You must explicitly clean them up:

- `destroy_empty()`: Succeeds only if the collection is empty. Works on all collection types.
- `drop()`: Drops a Table where all values have `drop`. Does not work on Bags, ObjectTables, or ObjectBags.

### Choosing a collection

| Need | Use |
|---|---|
| Large or unbounded homogeneous map | `Table<K, V>` |
| Large map where values are objects that should stay queryable | `ObjectTable<K, V>` |
| Heterogeneous storage (mixed types) | `Bag` or `ObjectBag` |
| Small bounded map (under ~100 entries) | `VecMap<K, V>` |
| Small unique-value set | `VecSet<K>` |
| Ordered iteration or pop from front/back | `LinkedTable<K, V>` |
| Inventory holding arbitrary Sui objects | `ObjectBag` (heterogeneous objects) or `ObjectTable` (homogeneous objects) |

## Versioning

Object versions use Lamport timestamps. When a transaction touches multiple objects, all of them receive the same new version: `1 + max(version of all input objects)`.

Example: if a transaction modifies an object at version 5 using a gas coin at version 3, both the object and the gas coin become version 6.

Only the most recent version is accessible to active transactions. Historical versions are available through versioned ID queries. Each object has a linear version history: exactly one transaction modifies it per version.

### Versioning and ownership

- **Fastpath (owned/immutable) objects:** Version is updated without consensus. Lowest latency. The transaction must lock the exact current version as input.
- **Consensus (shared) objects:** Version is updated through consensus ordering. Adds latency but enables multi-party access without offchain coordination.
- **Wrapped objects:** Version increments when the parent is modified, maintaining unique (ID, version) pairs. While wrapped, the object is not directly accessible by version.
- **Dynamic fields:** Version increments when the field is modified, following Lamport timestamps like regular objects.

## Derived objects

Derived objects use deterministic IDs computed from a parent object's ID and a key, rather than random assignment. Compute the address before creating the object:

```move
let derived_addr = derived_object::derive_address(parent_id, key);
```

Key properties:

- **Deterministic:** The same (parent, key) always produces the same address.
- **Not hierarchical:** Despite using a parent for uniqueness, derived objects are independent. The parent only ensures uniqueness.
- **Parallel-friendly:** Unrelated keys can be updated simultaneously because derived objects are independently owned, unlike dynamic fields which sequence through the parent.
- **Receive before creation:** Assets can be sent to a derived address before the derived object exists.

### Derived objects vs dynamic fields

| Aspect | Derived objects | Dynamic fields |
|---|---|---|
| Address predictable before creation | Yes | Yes |
| Parent required for access | Only at creation | Always |
| Independent ownership | Yes (any ownership type) | No (always owned by parent) |
| Can receive objects | Yes | No |
| Parallel access | Yes | Limited (sequenced through parent) |
| Supports deletion | Yes | Yes |

Use derived objects for registries, per-user configurations, soulbound tokens, and cases where you need parallel access without bottlenecking through a parent.

## Common patterns

### Hot potato pattern

A hot potato is a struct with no abilities at all. It cannot be stored, copied, or dropped. It must be consumed by a function in the same transaction (PTB). This enforces multi-step workflows:

```move
public struct Receipt {}  // no abilities

public fun borrow_item(safe: &mut Safe): (Item, Receipt) {
    let item = /* remove item from safe */;
    (item, Receipt {})
}

public fun return_item(safe: &mut Safe, item: Item, receipt: Receipt) {
    let Receipt {} = receipt;  // consume the hot potato
    /* put item back in safe */
}
```

The borrower must call `return_item` in the same PTB, because `Receipt` cannot be stored or dropped. If they do not, the transaction aborts.

### Capability pattern

A capability (cap) is an object that grants permission to perform an action. Common examples: `AdminCap`, `TreasuryCap`, `UpgradeCap`. Typically created in the module's `init` function and transferred to the publisher.

```move
public struct AdminCap has key, store { id: UID }

fun init(ctx: &mut TxContext) {
    transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
}

public fun admin_action(_: &AdminCap, registry: &mut Registry) {
    // Only callable by whoever holds the AdminCap
}
```

Caps can be stored inside other objects and temporarily borrowed using the `sui::borrow` module (borrow pattern with hot potato receipt).

### Soulbound objects

An object without `store` can only be transferred by its defining module. To make it fully non-transferable, simply do not expose any transfer function. To allow temporary borrowing with forced return, use the hot potato pattern with a `ReturnReceipt`.

### Inventory pattern

For an object that holds an arbitrary collection of other objects (like a player character with an equipment inventory), use `ObjectBag` or `ObjectTable`:

```move
public struct Player has key {
    id: UID,
    inventory: ObjectBag,  // holds any object type
}

public fun add_to_inventory<T: key + store>(player: &mut Player, item: T) {
    let item_id = object::id(&item);
    object_bag::add(&mut player.inventory, item_id, item);
}

public fun remove_from_inventory<T: key + store>(
    player: &mut Player, item_id: ID
): T {
    object_bag::remove(&mut player.inventory, item_id)
}
```

Use `ObjectBag` when items can be different types (Sword, Shield, Potion). Use `ObjectTable<ID, T>` when all items are the same type.

## System limits

Sui enforces limits on objects and transactions:

- Maximum single object size: 256 KB
- Maximum objects per transaction: 2,048
- Maximum transaction size: 128 KB
- Maximum dynamic fields per object: No hard limit, but each field is a separate storage operation

These limits are defined in the `ProtocolConfig` and can vary per network configuration.
