# Move Language Fundamentals

Move is Sui's smart contract language. It is platform-agnostic and designed around resource safety. Smart contracts on Sui are called Move packages.

For the complete language reference, see [The Move Book](https://move-book.com).

## Move abilities

Every struct in Move has a set of abilities that control what you can do with it. There are four abilities:

| Ability | What it allows | When to use |
|---|---|---|
| `key` | The struct is a Sui object with a globally unique ID. Must have an `id: UID` field. | Every onchain object needs this. |
| `store` | The struct can be stored inside other objects and transferred using `public_transfer`. | Add when other modules need to transfer or wrap this object. |
| `copy` | The struct can be duplicated. | Rarely used for objects. Useful for config values or read-only data. |
| `drop` | The struct can be silently discarded at the end of a scope. | Useful for ephemeral data like events or receipts. Objects with `key` typically should not have `drop` because you want to force explicit handling. |

Common combinations:

- `has key` alone: The object can only be transferred by functions in its own module. Use when you want strict access control.
- `has key, store`: The object can be transferred, wrapped, or stored by any module. Use for assets that should be freely composable.
- `has key, store, drop`: Rare for objects, but used for ephemeral, disposable items.
- `has copy, drop`: Not an object (no `key`). A plain data struct that can be passed around freely. Used for events, configs, or intermediate values.
- `has store`: Not an object on its own, but can be stored as a field inside an object.

Abilities are enforced at compile time. You cannot add abilities to a struct after publishing.

## TxContext

`TxContext` is a special parameter that the Sui runtime automatically provides as the last parameter to any Move function that declares it. Callers never pass it explicitly — the runtime injects it behind the scenes. It provides access to transaction metadata:

- `ctx.sender()`: The address that submitted the transaction.
- `ctx.epoch()`: The current epoch number (useful for time-based logic). Since TxContext is automatically provided by the runtime as the last parameter, you can call `ctx.epoch()` in any function that declares `ctx: &mut TxContext` without the caller needing to pass it.
- `ctx.epoch_timestamp_ms()`: The epoch start timestamp in milliseconds. Less precise than the Clock object but does not require passing an additional object.
- `object::new(ctx)`: Generates a fresh unique ID for a new object. This is the only way to create a `UID`.

`TxContext` is always the last parameter in a function signature as `ctx: &mut TxContext`. The Sui runtime automatically injects it — callers (whether PTBs, CLI commands, or SDK calls) never pass `TxContext` explicitly. The runtime supplies it as the final argument behind the scenes. When you see `ctx: &mut TxContext` in a function signature, treat it as an implicit parameter that the runtime fills in, not something you provide as an input.

## Clock object

The Clock is a shared system object at the well-known address `0x6`. It provides the current network timestamp in milliseconds. Pass it to Move functions that need precise time:

```move
use sui::clock::Clock;

public fun check_deadline(clock: &Clock) {
    let now_ms = clock.timestamp_ms();
    // ...
}
```

The Clock is more precise than `ctx.epoch_timestamp_ms()` (which returns only the epoch start time). Use the Clock for time-sensitive logic like auctions or deadlines. Use `ctx.epoch()` for epoch-level checks like staking windows.

## Init functions and One-Time Witness

### The init function

Each module can have an optional `init` function that runs exactly once when the package is published. It is never callable again. Use it to create singleton objects like admin capabilities, registries, or treasury caps.

```move
fun init(ctx: &mut TxContext) {
    transfer::transfer(
        AdminCap { id: object::new(ctx) },
        ctx.sender()
    );
}
```

If multiple modules in a package each have `init` functions, all of them run during the publish transaction. The object IDs created during `init` appear in the publish transaction's effects.

### One-Time Witness (OTW)

A One-Time Witness is a special struct that the runtime creates exactly once and passes to `init`. It proves that code is running during the module's publish transaction. The struct must:

- Have the same name as the module, in ALL CAPS.
- Have only the `drop` ability.
- Have no fields.

```move
module my_package::my_token {
    public struct MY_TOKEN has drop {}

    fun init(witness: MY_TOKEN, ctx: &mut TxContext) {
        // Use the witness to create a currency, for example
        let (treasury_cap, metadata) = coin::create_currency(
            witness, 9, b"MYT", b"My Token", b"", option::none(), ctx
        );
        // ...
    }
}
```

OTW is required by `coin::create_currency` and other framework functions that need proof of module authority.

## Move packages

A Move package is a set of compiled bytecode modules published to the Sui network as an immutable object. Every published package receives a unique package ID on the network.

A package contains:

- `sources/` directory with `.move` module files
- `Move.toml` configuration file defining the package name, edition, dependencies, and named addresses

## Package upgrades

Packages can be upgraded by publishing a new version, but the original version is always preserved onchain. Upgrades are controlled through an `UpgradeCap` object that the publisher receives at publish time. The `UpgradeCap` is an address-owned object sent to the publishing address.

Upgrade policies restrict what can change:

- **Compatible:** Functions can be added but not removed. Struct layouts cannot change.
- **Additive:** New modules can be added, but existing modules cannot change.
- **Dependency-only:** Only dependency versions can be updated.

You can restrict the `UpgradeCap` in the same PTB as the publish command (for example, calling `only_additive_upgrades` on it immediately). Once restricted, you cannot widen the policy. You can also transfer the `UpgradeCap` to a multisig address or destroy it to make the package permanently immutable.

## Move modules

A module lives inside a package and defines the types (structs) and functions that interact with onchain objects. Modules are the unit of encapsulation in Move.

## Move objects (structs)

Objects in Move are structs with typed fields. A struct can contain primitives, other objects, or non-object structs. The `key` ability marks a struct as an object (it must have an `id: UID` field). The `store` ability allows a struct to be stored inside other objects. See the "Move abilities" section above for the full ability reference.

## Resource safety

Move enforces two critical constraints at compile time:

1. All resources must be either moved into global storage or destroyed by the end of a transaction. You cannot silently drop an object (unless it has `drop`).
2. Resources without `copy` cannot be duplicated. There is always exactly one owner of any given resource.

These guarantees are enforced by the compiler, not by gas metering. This differs from Ethereum where the EVM prices operations to prevent abuse. In Move, invalid resource handling is a compilation error, not a runtime cost.

To destroy an object that lacks `drop`, you must explicitly unpack (destructure) the struct and handle each field. The UID field must be deleted using `object::delete(id)`, which consumes the UID by value. All other fields must be dropped (if they have `drop`), stored, or recursively unpacked.

```move
public struct Character has key {
    id: UID,
    name: String,
}

public fun destroy_character(character: Character) {
    let Character { id, name: _ } = character; // unpack the struct
    id.delete(); // delete the UID — required for all objects
}
```

A shared object can also be destroyed this way: if a function takes the shared object by value and deletes it within the same function, the system permits it.

## Example: a Greeting module

```move
module hello_world::greeting {
    use std::string::String;

    public struct Greeting has key, store {
        id: UID,
        text: String,
    }

    public fun new(ctx: &mut TxContext) {
        let greeting = Greeting {
            id: object::new(ctx),
            text: b"Hello world!".to_string(),
        };
        transfer::share_object(greeting);
    }

    public fun update_text(greeting: &mut Greeting, new_text: String) {
        greeting.text = new_text;
    }
}
```

Key patterns in this example:

- `Greeting` has the `key` ability (making it a Sui object) and `store` (allowing nested storage and public transfers).
- `object::new(ctx)` generates a unique ID for the new object.
- `transfer::share_object()` places the object in shared global storage so any address can interact with it.
- `&mut Greeting` is a mutable reference, allowing modification without violating resource safety.

## Access control patterns

### Admin rotation (two-step transfer)

Never transfer an `AdminCap` directly to a new address in one step — if the recipient address is wrong, the cap is lost forever. Use a two-step pattern:

```move
public struct AdminTransferRequest has key {
    id: UID,
    new_admin: address,
}

/// Step 1: current admin proposes a transfer
public fun propose_admin_transfer(
    cap: &AdminCap,
    new_admin: address,
    ctx: &mut TxContext,
) {
    transfer::transfer(AdminTransferRequest {
        id: object::new(ctx),
        new_admin,
    }, new_admin);
}

/// Step 2: new admin accepts and receives the cap
public fun accept_admin_transfer(
    cap: AdminCap,
    request: AdminTransferRequest,
    ctx: &mut TxContext,
) {
    let AdminTransferRequest { id, new_admin } = request;
    assert!(ctx.sender() == new_admin);
    id.delete();
    transfer::transfer(cap, new_admin);
}
```

The new admin must actively call `accept_admin_transfer`, proving they control the target address. If the request is never accepted, the cap stays with the original admin.

### Deny lists (regulated coins)

Sui provides a system-level `DenyList` shared object (`0x403`) for regulated coins. Use `coin::create_regulated_currency` instead of `coin::create_currency` to enable address-based transfer restrictions:

```move
use sui::coin;
use sui::deny_list::DenyList;

public struct MY_TOKEN has drop {}

fun init(otw: MY_TOKEN, ctx: &mut TxContext) {
    let (treasury_cap, deny_cap, metadata) = coin::create_regulated_currency(
        otw, 9, b"TKN", b"Token", b"A regulated token", option::none(), ctx,
    );
    transfer::public_transfer(treasury_cap, ctx.sender());
    transfer::public_transfer(deny_cap, ctx.sender());
    transfer::public_freeze_object(metadata);
}

/// Add an address to the deny list (requires DenyCap)
public fun block_address(
    deny_list: &mut DenyList,
    deny_cap: &mut DenyCap<MY_TOKEN>,
    addr: address,
    ctx: &mut TxContext,
) {
    coin::deny_list_v2_add(deny_list, deny_cap, addr, ctx);
}

/// Remove an address from the deny list
public fun unblock_address(
    deny_list: &mut DenyList,
    deny_cap: &mut DenyCap<MY_TOKEN>,
    addr: address,
    ctx: &mut TxContext,
) {
    coin::deny_list_v2_remove(deny_list, deny_cap, addr, ctx);
}
```

Key points:
- `create_regulated_currency` returns an additional `DenyCap<T>` alongside the `TreasuryCap`.
- The `DenyCap` authorizes adding/removing addresses from the deny list. Custody of the `DenyCap` is as important as the `TreasuryCap`.
- Denied addresses cannot receive the coin type in any transaction. The restriction is enforced at the validator level.
- The `DenyList` object at `0x403` is a system shared object. Reference it from TypeScript with `tx.object.denyList()`.

For custom (non-coin) deny lists, store a `Table<address, bool>` or `VecSet<address>` in a shared object and check it in your entry functions.

### Security review checklist

When reviewing a Move package's access control:

1. **Capability custody.** Where is each cap (`AdminCap`, `TreasuryCap`, `DenyCap`, `UpgradeCap`) created? Where does it end up? Is it transferred to `ctx.sender()` in `init`, or is it shared/wrapped? Can it be transferred to a new owner, and if so, through what mechanism?
2. **Shared object entry points.** Every `public` or `entry` function that takes a `&mut SharedObject` is callable by any address. Verify that each one either (a) checks a capability, (b) checks `ctx.sender()` against a stored admin address, or (c) is intentionally permissionless.
3. **`entry` vs `public` visibility.** `entry` functions are only callable as the first command in a PTB (not composable). `public` functions are callable from other Move code and PTBs. Prefer `public` for composability, but be aware that `public` functions can be called by any other package.
4. **Admin rotation.** Is there a way to transfer admin authority? If so, does it use a two-step pattern? A single-step transfer risks permanent loss if the recipient address is wrong.
5. **Deny list / blocklist.** For regulated tokens, is `create_regulated_currency` used? Is the `DenyCap` custody secured? For custom deny lists, are blocked addresses checked in all relevant entry points?
6. **Event emission.** Are security-critical actions (admin changes, deny list modifications, object deletions, configuration updates) emitting events? Events are the only way for offchain monitoring to detect these actions.
7. **Object deletion.** Can shared objects be deleted? If so, who can delete them? Deleting a shared object with dynamic fields renders those fields permanently inaccessible.
8. **Upgrade policy.** Is the `UpgradeCap` held by a multisig or has the package been made immutable? An unrestricted `UpgradeCap` held by a single key means the entire package can be rewritten.
