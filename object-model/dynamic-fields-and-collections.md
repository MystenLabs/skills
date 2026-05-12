# Dynamic Fields and Collections

Dynamic fields attach key-value data to an object at runtime, beyond the fields declared in the struct. Collections are higher-level types built on dynamic fields for common storage patterns.

## Dynamic field types

| Type | Module | Value requirement | External visibility |
|---|---|---|---|
| Dynamic field | `sui::dynamic_field` | Any type with `store` | Wrapped: not visible to explorers or wallets by ID |
| Dynamic object field | `sui::dynamic_object_field` | Must be an object (`key + store`) | Child retains its own ID, visible to explorers and wallets |

**When to use dynamic object field:** When the stored value is an object that should remain independently queryable (for example, an NFT inside an inventory that you want to look up by its ID). Use this when you need "my player NFT needs an inventory that supports any arbitrary Sui object."

**When to use dynamic field:** When the stored value is a plain type (like `u64`, `String`, or a non-object struct), or when you do not need the child to be independently addressable.

## Field naming

Dynamic field names accept any value with `copy`, `drop`, and `store` abilities. This includes primitives (`u64`, `address`, `String`) and custom structs with those abilities. This is more flexible than regular struct fields, which require Move identifiers.

## Core API

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

Use plain function calls (`dynamic_field::add`, `table::add`, etc.) instead of receiver syntax for dynamic field and collection operations.

Replace `dynamic_field` with `dynamic_object_field` for object fields. The API is identical.

Accessing a nonexistent field aborts the transaction. Adding a field with a name that already exists (same name and type) also aborts.

## Collections

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

## System limits

- Maximum single object size: 256 KB
- Maximum objects per transaction: 2,048
- Maximum transaction size: 128 KB
- Maximum dynamic fields per object: No hard limit, but each field is a separate storage operation

These limits are defined in the `ProtocolConfig` and can vary per network configuration.
