# Ownership Types and Versioning

Every object on Sui has exactly one of five ownership types. The ownership type determines who can use the object, whether it goes through consensus, and how it behaves in transactions.

## Address-owned objects

Owned by a specific 32-byte address. Only that address can use the object as a transaction input. Created through `transfer::transfer()` or `transfer::public_transfer()`.

Address-owned objects skip consensus entirely (fastpath). This gives them the lowest latency and highest throughput. Most transactions on Sui (transfers, personal asset management, single-player game moves) touch only owned objects and execute in parallel.

The tradeoff: only one address can use the object. If multiple users need access, use a shared object instead.

## Shared objects

Accessible to any address on the network. Created through `transfer::share_object()` or `transfer::public_share_object()`. Once shared, an object cannot be unshared or converted back to address-owned.

Shared objects require consensus ordering through Mysticeti. This adds latency and gas cost compared to owned objects. Use shared objects when multiple users or modules need to read or write the same state (registries, pools, marketplaces, shared game state).

**Access mode optimization:** When a function takes a shared object by immutable reference (`&`), the system marks it as `mutable: false` and can schedule multiple read-only transactions on that shared object in parallel. When taken by mutable reference (`&mut`) or by value, the system marks it as `mutable: true` and consensus must sequence those transactions. Prefer immutable references on shared objects whenever mutation is not needed.

**Frontend access:** To use a shared object in a transaction from a frontend or CLI, you reference it by its object ID as a transaction input. There is no need to "fetch" or "get" the shared object before including it in a programmable transaction block. Anyone on the network can reference a shared object by ID. Implement access control within your Move functions if needed.

## Immutable (frozen) objects

Cannot be changed, transferred, or deleted. Anyone can read them. Created through `transfer::freeze_object()` or `transfer::public_freeze_object()`. Freezing is permanent and irreversible.

Immutable objects skip consensus (like owned objects). Use for reference data, published packages, and constants that never change.

## Wrapped objects

An object stored as a field inside another object. Wrapped objects are not directly accessible by ID; they can only be reached through their parent. While wrapped, the object cannot be passed as a transaction input, even if you know its ID.

When unwrapped, the object regains direct access and retains its original ID.

Wrapping requires the child object to have the `store` ability (so it can be stored inside the parent). Wrapping and unwrapping can happen within the same transaction.

Use wrapping for tight coupling: when a child should only be accessible through its parent (equipment inside a character, items inside a chest).

## Party objects

Owned by a specified party at transfer time and versioned by consensus. Combines ownership assignment with consensus-based versioning. Used for specialized multi-party coordination.

## Object versioning

Object versions use Lamport timestamps. When a transaction touches multiple objects, all of them receive the same new version: `1 + max(version of all input objects)`.

Example: if a transaction modifies an object at version 5 using a gas coin at version 3, both the object and the gas coin become version 6.

Only the most recent version is accessible to active transactions. Historical versions are available through versioned ID queries. Each object has a linear version history: exactly one transaction modifies it per version.

### Versioning and ownership

- **Fastpath (owned/immutable) objects:** Version is updated without consensus. Lowest latency. The transaction must lock the exact current version as input.
- **Consensus (shared) objects:** Version is updated through consensus ordering. Adds latency but enables multi-party access without offchain coordination.
- **Wrapped objects:** Version increments when the parent is modified, maintaining unique (ID, version) pairs. While wrapped, the object is not directly accessible by version.
- **Dynamic fields:** Version increments when the field is modified, following Lamport timestamps like regular objects.
