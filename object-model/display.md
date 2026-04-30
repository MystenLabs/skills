# Object Display

Object Display defines how objects render in wallets, explorers, and apps. It is a template system that maps struct field names to display properties like name, description, image URL, and links.

## Creating a Display

A `Publisher` object is required to create a Display. The `Publisher` proves module authority and is obtained during the module's `init` function using `package::claim(otw, ctx)`.

```move
use sui::display;
use sui::package;

public struct MY_NFT has drop {}

public struct GameItem has key, store {
    id: UID,
    name: String,
    image_id: u64,
    rarity: String,
}

fun init(otw: MY_NFT, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);

    let mut d = display::new<GameItem>(&publisher, ctx);
    d.add(b"name".to_string(), b"{name}".to_string());
    d.add(b"description".to_string(), b"A {rarity} game item".to_string());
    d.add(b"image_url".to_string(), b"https://example.com/items/{image_id}.png".to_string());
    d.update_version();

    transfer::public_transfer(d, ctx.sender());
    transfer::public_transfer(publisher, ctx.sender());
}
```

## Template syntax

Display templates use `{field_name}` syntax. The placeholder is replaced with the actual field value from the object at display time. You can combine static text with field interpolation:

- `{name}` — replaced with the object's `name` field
- `A {rarity} game item` — combines static text with the `rarity` field
- `https://example.com/{image_id}.png` — constructs a URL from a field value

## Common display properties

| Property | Purpose |
|---|---|
| `name` | The object's display name |
| `description` | A human-readable description |
| `image_url` | URL to the object's image |
| `link` | URL to the object's page in an app |
| `project_url` | URL to the project's website |
| `creator` | The creator's name or identifier |

## Finalizing changes

After adding or modifying display properties, you must call `update_version()` to publish the changes. Without this call, wallets and explorers do not pick up the new display configuration. Each call to `update_version()` increments the display's version, signaling consumers to refresh their cached rendering.

## Key rules

- Multiple `Display<T>` objects can be created for the same type, but only the most recently updated one is used by the full node for rendering. In practice, create one and update it as needed.
- The `Publisher` object is the access control mechanism. Only the package that defines a type can create its Display.
- Display objects have `key` and `store`, so they can be transferred to other addresses for management.
