# Object Model and Ownership

Sui treats every piece of onchain state as a typed object with a unique ID. Transactions consume objects as inputs and produce modified versions as outputs.

## Object states

Every item on the Sui network is an object. Objects have two possible states:

- **Immutable:** Publicly accessible and unchangeable. Published Move packages are immutable objects.
- **Mutable:** Transferable, modifiable, and potentially shared across transactions.

Each object maintains a unique ID and a version number. When a transaction modifies an object, it produces a new version with an incremented version number while preserving the original ID. This versioning model enables Sui to process independent transactions in parallel because non-overlapping object sets never conflict.

## Object ownership

Objects on Sui have one of four ownership types:

- **Address-owned:** Only the owning address can use the object as a transaction input. Created through `transfer::transfer()` or `transfer::public_transfer()`. These objects enable parallel execution because only one address can touch them.
- **Shared:** Any address can use the object. Created through `transfer::share_object()` or `transfer::public_share_object()`. Shared objects require ordered consensus (Mysticeti) but support multi-party interactions. Once shared, an object cannot be unshared.
- **Immutable (frozen):** No address owns it. Anyone can read it, but no one can mutate or delete it. Created through `transfer::freeze_object()` or `transfer::public_freeze_object()`. Freezing is permanent and irreversible.
- **Wrapped:** An object stored inside another object's fields. Wrapped objects are not directly accessible by address; they can only be accessed through the parent object. Wrapping and unwrapping can happen within the same transaction.

The `public_` variants of transfer functions (`public_transfer`, `public_share_object`, `public_freeze_object`) work on objects with the `store` ability and can be called from any module. The non-public variants work only within the module that defines the object's type.

## Consensus and parallel execution

Sui uses the Mysticeti consensus protocol. The key insight is that transactions on owned objects skip consensus entirely because there are no conflicts to resolve. Only shared-object transactions go through consensus ordering. This separation is what gives Sui its throughput advantage: most transactions (transfers, single-player game moves, personal asset management) touch only owned objects and execute in parallel.

### Shared object access mode optimization

When a shared object is used as a transaction input, the system records whether the access is mutable or read-only. If a function takes the shared object by immutable reference (`&`), the transaction marks it as `mutable: false`. The system can then schedule multiple read-only transactions on the same shared object in parallel. If a function takes the shared object by mutable reference (`&mut`) or by value, the transaction marks it as `mutable: true`, and consensus must sequence those transactions. Prefer immutable references on shared objects whenever mutation is not needed to maximize throughput.
