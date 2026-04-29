# Move Standard Library Types

Sui provides built-in types and modules for common onchain patterns: dynamic fields, collections, events, coins, and object display.

## Dynamic fields

Dynamic fields allow you to attach key-value data to an object at runtime, beyond the fields defined in the struct. There are two types:

- `dynamic_field`: Stores any value type. The value exists as part of the parent object's storage.
- `dynamic_object_field`: Stores objects (structs with `key`). The child object retains its own ID and can be looked up independently.

Use dynamic fields when:

- You need a variable number of fields not known at compile time.
- You want to attach data to an object without modifying its module.
- You need map-like storage tied to an object.

## Collections

Sui provides several collection types in the standard library:

| Type | Description | When to use |
|---|---|---|
| `Table<K, V>` | Dynamic key-value map backed by dynamic fields. O(1) lookup. | Large or unbounded collections. The default choice. |
| `ObjectTable<K, V>` | Like `Table` but values must be objects (`key + store`). Child objects keep their IDs. | When you need to look up stored objects by their ID. |
| `Bag` | Heterogeneous dynamic field collection (values can be different types). | When you need to store mixed types under one parent. |
| `ObjectBag` | Like `Bag` but values must be objects. | Mixed-type object storage. |
| `VecMap<K, V>` | On-stack vector-backed map. O(n) lookup. | Small collections (under ~100 entries). No dynamic fields needed. |
| `VecSet<K>` | On-stack vector-backed set. | Small unique-value sets. |
| `LinkedTable<K, V>` | Doubly-linked map with iteration order. | When you need ordered traversal or deletion by key. |

`Table` and `Bag` use dynamic fields internally, so they scale well but each entry costs a separate storage operation. `VecMap` and `VecSet` are stored inline, so they are cheaper for small collections but do not scale.

## Events

Events let Move code emit data that offchain systems can subscribe to. Events are not stored onchain as objects; they exist only in the transaction's effects.

```move
use sui::event;

public struct ItemCreated has copy, drop {
    item_id: ID,
    creator: address,
}

public fun create_item(ctx: &mut TxContext) {
    let item = Item { id: object::new(ctx) };
    event::emit(ItemCreated {
        item_id: object::id(&item),
        creator: ctx.sender(),
    });
    transfer::transfer(item, ctx.sender());
}
```

Event structs must have `copy` and `drop` abilities. Subscribe to events offchain using the Sui TypeScript SDK or GraphQL API, filtering by event type.

## Coin operations

The `sui::coin` module provides the standard fungible token implementation. Key operations:

- `coin::create_currency(witness, decimals, symbol, name, description, icon_url, ctx)`: Creates a new currency using a One-Time Witness. Returns a `TreasuryCap` (for minting/burning) and `CoinMetadata`.
- `coin::mint(treasury_cap, amount, ctx)`: Mint new coins.
- `coin::burn(treasury_cap, coin)`: Burn coins.
- `coin::split(coin, amount, ctx)`: Split a coin, returning a new coin with the specified amount.
- `coin::join(coin1, coin2)`: Merge two coins of the same type into one (called `merge` at the PTB level).
- `coin::value(coin)`: Read the balance of a coin.

SUI itself is a coin of type `0x2::sui::SUI`. Coins are objects with `key` and `store`, so they can be freely transferred and stored.

## Object Display

Object Display defines how objects render in wallets, explorers, and apps. It is a template system that maps struct field names to display properties (name, description, image URL, link, and so on).

```move
use sui::display;

let mut d = display::new<MyNFT>(&publisher, ctx);
d.add(b"name".to_string(), b"{name}".to_string());
d.add(b"image_url".to_string(), b"https://example.com/{image_id}.png".to_string());
d.update_version();
transfer::public_transfer(d, ctx.sender());
```

The `{field_name}` syntax in templates is replaced with the actual field value at display time. A `Publisher` object (obtained during `init`) is required to create a Display.
