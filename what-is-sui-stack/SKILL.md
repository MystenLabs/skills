---
name: sui-fundamentals
description: >
  Core reference for what Sui is, how the Sui Stack works, and how its components
  fit together. Use this skill whenever building on Sui, writing Move smart contracts,
  integrating Sui into a frontend, or explaining Sui concepts. This skill provides
  foundational context that other Sui developer skills depend on. Make sure to use
  this skill whenever the user mentions Sui, Move language, Sui objects, Sui
  transactions, Sui addresses, the Sui CLI, Sui dApp Kit, or any Sui network
  (Mainnet, Testnet, Devnet, Localnet). Also use when the user asks about object
  abilities (key, store, copy, drop), TxContext, dynamic fields, package upgrades,
  coin operations, PTBs, gas costs, epochs, events, Object Display, sponsored
  transactions, One-Time Witness, or init functions. Also use when migrating from
  Ethereum or Solana to Sui.
---

# Sui Fundamentals

> **Source constraint:** All information in this skill is sourced exclusively from [docs.sui.io](https://docs.sui.io), [docs.wal.app](https://docs.wal.app), and [move-book.com](https://move-book.com). When extending or updating this skill, only pull from these three sources. Do not use third-party blogs, tutorials, or unofficial documentation.

Sui is a scalable, performant layer 1 blockchain built around an object-centric data model. Unlike account-based blockchains (Ethereum) or UTXO-based chains (Bitcoin), Sui treats every piece of onchain state as a typed object with a unique ID. Transactions consume objects as inputs and produce modified versions as outputs.

This skill provides the foundational mental model for building on Sui. Other use-case skills (DeFi, NFTs, gaming, identity) reference this skill for core concepts.

## The object-centric model

Every item on the Sui network is an object. Objects have two possible states:

- **Immutable:** Publicly accessible and unchangeable. Published Move packages are immutable objects.
- **Mutable:** Transferable, modifiable, and potentially shared across transactions.

Each object maintains a unique ID and a version number. When a transaction modifies an object, it produces a new version with an incremented version number while preserving the original ID. This versioning model enables Sui to process independent transactions in parallel because non-overlapping object sets never conflict.

### Object ownership

Objects on Sui have one of four ownership types:

- **Address-owned:** Only the owning address can use the object as a transaction input. Created through `transfer::transfer()` or `transfer::public_transfer()`. These objects enable parallel execution because only one address can touch them.
- **Shared:** Any address can use the object. Created through `transfer::share_object()` or `transfer::public_share_object()`. Shared objects require ordered consensus (Mysticeti) but support multi-party interactions. Once shared, an object cannot be unshared.
- **Immutable (frozen):** No address owns it. Anyone can read it, but no one can mutate or delete it. Created through `transfer::freeze_object()` or `transfer::public_freeze_object()`. Freezing is permanent and irreversible.
- **Wrapped:** An object stored inside another object's fields. Wrapped objects are not directly accessible by address; they can only be accessed through the parent object. Wrapping and unwrapping can happen within the same transaction.

The `public_` variants of transfer functions (`public_transfer`, `public_share_object`, `public_freeze_object`) work on objects with the `store` ability and can be called from any module. The non-public variants work only within the module that defines the object's type.

### Consensus and parallel execution

Sui uses the Mysticeti consensus protocol. The key insight is that transactions on owned objects skip consensus entirely because there are no conflicts to resolve. Only shared-object transactions go through consensus ordering. This separation is what gives Sui its throughput advantage: most transactions (transfers, single-player game moves, personal asset management) touch only owned objects and execute in parallel.

#### Shared object access mode optimization

When a shared object is used as a transaction input, the system records whether the access is mutable or read-only. If a function takes the shared object by immutable reference (`&`), the transaction marks it as `mutable: false`. The system can then schedule multiple read-only transactions on the same shared object in parallel. If a function takes the shared object by mutable reference (`&mut`) or by value, the transaction marks it as `mutable: true`, and consensus must sequence those transactions. Prefer immutable references on shared objects whenever mutation is not needed to maximize throughput.

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

`TxContext` is a special parameter available in every Move transaction. It provides access to transaction metadata:

- `ctx.sender()`: The address that submitted the transaction.
- `ctx.epoch()`: The current epoch number (useful for time-based logic).
- `ctx.epoch_timestamp_ms()`: The epoch start timestamp in milliseconds. Less precise than the Clock object but does not require passing an additional object.
- `object::new(ctx)`: Generates a fresh unique ID for a new object. This is the only way to create a `UID`.

`TxContext` is always the last parameter in a function signature as `ctx: &mut TxContext`. It does not need to be explicitly passed by the caller; the runtime provides it automatically.

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

## Sui addresses and accounts

A Sui address is a unique 32-byte identifier displayed in hexadecimal with a `0x` prefix:

```
0x02a212de6a9dfa3a69e22387acfbafbb1a9e591bd9d636e7895dcfc8de05f331
```

Addresses derive from a cryptographic hash of a public key. Each public key has a corresponding private key that grants access to the address and its owned objects. Together, an address and its key pair constitute an account.

Key facts about Sui addresses:

- No personally identifying information is required to create one.
- An individual can create multiple addresses.
- Every address has a 12-word recovery phrase generated at creation time. Sui displays this phrase only once and does not store it.
- Sui supports the ed25519 key scheme for generating new addresses.
- Private keys are stored locally in `~/.sui/sui_config/sui.keystore` (macOS/Linux) or `%USERPROFILE%\.sui\sui_config\sui.keystore` (Windows).
- Addresses can have human-readable aliases (for example, `vigorous-spinel`) used in place of the full hex string.

## The Sui CLI

The Sui CLI (`sui`) is the primary tool for interacting with Sui networks from the command line. Install it through `suiup`, which also supports installing other Sui Stack components like Walrus and MVR.

### Configuration

Sui stores its configuration in `~/.sui/sui_config/client.yaml`. This file contains:

- Network environment connections (Mainnet, Testnet, Devnet, Localnet)
- The active environment and active address
- The keystore file location

Running `sui client` for the first time generates this file, creates a new key pair, and sets Testnet as the default environment.

### Essential CLI commands

| Command | Purpose |
|---|---|
| `sui --version` | Verify installation |
| `sui client active-address` | Show the current active address |
| `sui client active-env` | Show the current network |
| `sui client balance` | Check SUI token balance |
| `sui client objects` | List objects owned by the active address |
| `sui client switch --address <ADDRESS>` | Change the active address |
| `sui client new-address ed25519` | Create a new address |
| `sui client publish` | Publish a Move package |
| `sui client upgrade --upgrade-capability <CAP_ID>` | Upgrade a published package |
| `sui client call --package <ID> --module <MOD> --function <FN>` | Call a Move function |
| `sui move build` | Compile a Move package |

## Sui networks

Sui operates four network environments:

- **Mainnet:** Production network. SUI tokens have real monetary value. Use for final deployments.
- **Testnet:** Mirrors Mainnet features. Free SUI tokens from faucets. Use for integration testing and staging.
- **Devnet:** Development network. Free SUI tokens. Use for early-stage development and experimentation.
- **Localnet:** Runs locally on your machine. Use for offline development and unit testing.

### Gas cost model

Every transaction on Sui requires SUI tokens to pay gas. The total gas cost is:

**gas cost = computation cost + storage cost - storage rebate**

- **Computation cost:** Proportional to the computational effort of executing the transaction.
- **Storage cost:** The cost of storing new or expanded objects onchain. You pay for the bytes your objects occupy.
- **Storage rebate:** When a transaction deletes objects or reduces their size, you receive a rebate for the storage freed. This incentivizes cleaning up unused state.

The gas budget (`--gas-budget`) sets the maximum you are willing to pay. If the transaction exceeds the budget, it aborts. On Testnet and Devnet, tokens are free through faucets at `faucet.sui.io`, the Sui Discord channels (`#devnet-faucet`, `#testnet-faucet`), or programmatically through the TypeScript SDK's `requestSuiFromFaucetV2()` function. Gas prices can vary per epoch; query the current gas price through the RPC.

### Epochs

An epoch is a fixed time period during which the validator set and gas price remain constant. On Mainnet, one epoch is approximately 24 hours. At the epoch boundary, the network processes staking rewards, rotates validators, and updates the gas price. Use `ctx.epoch()` to read the current epoch number in Move and `ctx.epoch_timestamp_ms()` for the epoch start time.

## Move: the smart contract language

Move is Sui's smart contract language. It is platform-agnostic and designed around resource safety. Smart contracts on Sui are called Move packages. Three structural components define the Move programming model on Sui:

### Move packages

A Move package is a set of compiled bytecode modules published to the Sui network as an immutable object. Every published package receives a unique package ID on the network.

A package contains:

- `sources/` directory with `.move` module files
- `Move.toml` configuration file defining the package name, edition, dependencies, and named addresses

### Package upgrades

Packages can be upgraded by publishing a new version, but the original version is always preserved onchain. Upgrades are controlled through an `UpgradeCap` object that the publisher receives at publish time. The `UpgradeCap` is an address-owned object sent to the publishing address.

Upgrade policies restrict what can change:

- **Compatible:** Functions can be added but not removed. Struct layouts cannot change.
- **Additive:** New modules can be added, but existing modules cannot change.
- **Dependency-only:** Only dependency versions can be updated.

You can restrict the `UpgradeCap` in the same PTB as the publish command (for example, calling `only_additive_upgrades` on it immediately). Once restricted, you cannot widen the policy. You can also transfer the `UpgradeCap` to a multisig address or destroy it to make the package permanently immutable.

### Move modules

A module lives inside a package and defines the types (structs) and functions that interact with onchain objects. Modules are the unit of encapsulation in Move.

### Move objects (structs)

Objects in Move are structs with typed fields. A struct can contain primitives, other objects, or non-object structs. The `key` ability marks a struct as an object (it must have an `id: UID` field). The `store` ability allows a struct to be stored inside other objects. See the "Move abilities" section above for the full ability reference.

### Resource safety

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

### Dynamic fields

Dynamic fields allow you to attach key-value data to an object at runtime, beyond the fields defined in the struct. There are two types:

- `dynamic_field`: Stores any value type. The value exists as part of the parent object's storage.
- `dynamic_object_field`: Stores objects (structs with `key`). The child object retains its own ID and can be looked up independently.

Use dynamic fields when:

- You need a variable number of fields not known at compile time.
- You want to attach data to an object without modifying its module.
- You need map-like storage tied to an object.

### Collections

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

### Events

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

### Coin operations

The `sui::coin` module provides the standard fungible token implementation. Key operations:

- `coin::create_currency(witness, decimals, symbol, name, description, icon_url, ctx)`: Creates a new currency using a One-Time Witness. Returns a `TreasuryCap` (for minting/burning) and `CoinMetadata`.
- `coin::mint(treasury_cap, amount, ctx)`: Mint new coins.
- `coin::burn(treasury_cap, coin)`: Burn coins.
- `coin::split(coin, amount, ctx)`: Split a coin, returning a new coin with the specified amount.
- `coin::join(coin1, coin2)`: Merge two coins of the same type into one (called `merge` at the PTB level).
- `coin::value(coin)`: Read the balance of a coin.

SUI itself is a coin of type `0x2::sui::SUI`. Coins are objects with `key` and `store`, so they can be freely transferred and stored.

### Object Display

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

### Example: a Greeting module

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

## Transactions

A transaction on Sui is a request to read or modify objects. Transactions have the following constraints:

- Maximum size: 128 KB
- Maximum objects per transaction: 2,048
- Transactions must be submitted sequentially from a given address. Simultaneous submissions cause reservation errors because the network reserves objects during processing to prevent conflicts.

### Programmable transaction blocks

Programmable transaction blocks (PTBs) batch multiple commands into a single atomic transaction. This reduces gas costs and guarantees all-or-nothing execution. Within a PTB, you can:

- Call multiple Move functions in sequence.
- Pass the result of one call as input to the next.
- Split, merge, and transfer coins.
- Publish a package and immediately restrict its `UpgradeCap`.
- Transfer created objects to specific addresses.

PTBs are the standard way to compose operations. Virtually every Sui transaction is a PTB, even single-command ones.

### Sponsored transactions

A sponsored transaction is one where a third party (the sponsor) pays the gas fee on behalf of the sender. The sender signs the transaction data; the sponsor signs the gas payment. This enables gasless user experiences where an app backend covers transaction costs.

## Frontend integration with Sui dApp Kit

Sui dApp Kit is a set of React components and hooks for building frontends that interact with the Sui network. It provides:

- **Wallet connection:** Components for connecting browser wallets (Slush Wallet, Coinbase Wallet, and others).
- **Transaction signing:** Hooks for constructing and signing transactions from the browser.
- **Object queries:** Hooks for reading onchain object state.

### Typical frontend stack

A Sui frontend app uses:

1. **React** as the UI framework
2. **Sui dApp Kit** (`@mysten/dapp-kit`) for wallet and transaction hooks
3. **Sui TypeScript SDK** (`@mysten/sui`) for network interaction and transaction construction
4. **A package manager** like `pnpm`

### Frontend workflow

1. The user connects their wallet through the dApp Kit wallet connection component.
2. The app constructs a transaction (a PTB) that calls Move functions on a published package.
3. The wallet prompts the user to approve and sign the transaction.
4. The signed transaction is submitted to the network.
5. The app reads the updated object state and displays results.

Wallet addresses are separate from CLI-created addresses. A user might need to transfer tokens between their CLI address and wallet address. To serialize a transaction for frontend signing, build the PTB on the backend and send the bytes to the frontend, where the wallet signs and executes it.

### Clock object

The Clock is a shared system object at the well-known address `0x6`. It provides the current network timestamp in milliseconds. Pass it to Move functions that need precise time:

```move
use sui::clock::Clock;

public fun check_deadline(clock: &Clock) {
    let now_ms = clock.timestamp_ms();
    // ...
}
```

The Clock is more precise than `ctx.epoch_timestamp_ms()` (which returns only the epoch start time). Use the Clock for time-sensitive logic like auctions or deadlines. Use `ctx.epoch()` for epoch-level checks like staking windows.

## The Sui Stack

The Sui Stack is the full set of native primitives and infrastructure that Sui provides for building apps. Beyond the core blockchain, the stack includes:

- **Randomness:** Onchain random number generation for gaming, lotteries, and fair selection.
- **Time primitives:** The Clock object (`0x6`) for millisecond timestamps and `ctx.epoch()` for epoch-based timing.
- **zkLogin:** Zero-knowledge proof authentication that lets users log in with OAuth providers (Google, Apple) without exposing their identity onchain.
- **Walrus:** Decentralized data storage for large files, media, and data that does not belong directly onchain.
- **Nautilus:** Secure offchain computation with onchain verification.
- **DeepBook:** A fully onchain central limit order book (CLOB) for trading.
- **Kiosk:** A decentralized commerce standard for listing, purchasing, and managing digital assets with creator-defined transfer policies.

These components work together to provide a complete development platform. For example, a gaming app might use Move for game logic, randomness for fair outcomes, Walrus for storing game assets, zkLogin for frictionless player onboarding, and Kiosk for an in-game marketplace.

## Use cases Sui enables

Sui's object-centric model, parallel execution, and native primitives make it well suited for:

- **DeFi:** DeepBook provides onchain order books. Programmable transaction blocks enable complex multi-step financial operations atomically. Kiosk supports asset trading with royalty enforcement.
- **Gaming:** Sub-second finality and parallel execution support real-time game state. Onchain randomness enables provably fair mechanics. Objects naturally represent game items with ownership and transferability.
- **NFTs and digital assets:** Objects are the native representation of unique digital items. Kiosk provides a commerce layer with creator-controlled transfer policies. Walrus stores associated media. Object Display controls how assets render in wallets.
- **Identity and authentication:** zkLogin removes the need for users to manage private keys directly, lowering the onboarding barrier. Addresses are pseudonymous by default.
- **Social and content platforms:** Walrus handles media storage at scale. Objects represent posts, profiles, and social graphs. Parallel execution supports high-throughput social feeds.
- **Supply chain and real-world assets:** Object versioning provides an auditable history. Immutable objects serve as tamper-proof records. Shared objects enable multi-party workflows.

## How components work together

The Sui development workflow connects these components:

1. **Write smart contracts in Move.** Define your objects, their abilities, and the functions that create and modify them. Use `init` for one-time setup. Move's resource safety guarantees correctness at compile time.
2. **Publish packages to the network.** The Sui CLI compiles and deploys your Move code, returning a package ID and an `UpgradeCap`. Use PTBs to restrict upgrade policies at publish time.
3. **Interact through transactions.** Call published functions, passing objects as inputs. Use programmable transaction blocks to compose multiple operations atomically. Split and merge coins, transfer objects, and call multiple functions in a single transaction.
4. **Build frontends with dApp Kit.** Connect wallets, construct PTBs, and display onchain state using React hooks and components. Use sponsored transactions for gasless onboarding.
5. **Extend with Sui Stack primitives.** Add randomness, zkLogin, Walrus storage, DeepBook trading, or Kiosk commerce as your use case requires. Use events to stream onchain activity to your backend. Use the Clock for time-sensitive logic.

Each layer builds on the one before it. Move provides the onchain logic. Transactions execute that logic. The CLI and SDKs provide developer and programmatic access. dApp Kit connects end users. The Sui Stack primitives add specialized capabilities without leaving the ecosystem.
