# Ethereum to Sui: Pattern Mappings and Comparisons

Detailed mappings between Ethereum/Solidity patterns and their Sui Move equivalents.

## Programming model comparison

| Aspect | Ethereum / Solidity | Sui / Move |
|--------|-------------------|------------|
| Programming language | Solidity | Move |
| Data model | Account-centric | Object-centric |
| Data storage | Data stored in the smart contract | Data stored in Move objects |
| Inheritance | Supports multiple inheritance, polymorphism, dynamic dispatch | No interfaces, no polymorphism, no dynamic dispatch. Has generics (`Type<T>`) |
| Asset accessibility | Bound to smart contract | Anyone can access shared objects. Owned objects only accessible by owner |
| Access control | Identity/role-based (Ownable, AccessControl contracts) | Capability-based through owned objects |
| Contract upgrades | Proxy contract forwards user transactions | New contracts must be layout-compatible with the old one |
| State mutation | Sending transactions through compile-time ABI interface | Sending transactions through runtime PTB construction |

## Account-centric vs object-centric model

**Solidity (account-centric):** Custom ownership logic is written within contracts using mappings. Only Ethereum coins are first-class citizens with global APIs.

**Move (object-centric):** Object ownership is inherent to Sui. Objects are first-class citizens encompassing everything owned on Sui. Objects store data in Move, and everything in Move is an object -- this includes smart contracts (Move packages), onchain addresses, coins, and NFTs.

## Data storage

**Solidity:** Data is stored in the smart contract itself.

**Move:** Data is stored in Move objects. Logic is defined in the contract (package), but the data lives in separate objects. The owner invokes contract functions via PTB, and the protocol checks ownership at the protocol level.

## Inheritance and polymorphism

**Solidity:** Supports multiple inheritance, polymorphism, and dynamic dispatch. Contracts can extend other contracts, override functions, and use interface-based dispatch.

**Move:** No interfaces, no polymorphism, no dynamic dispatch. Move uses generics (`Type<T>`) for type parameterization instead. Code reuse is achieved through module imports and generic functions, not inheritance hierarchies.

## Asset and token accessibility

**Solidity:** Assets are bound to a smart contract. To interact with a token, you must go through the contract that defines it.

**Move:** Anyone can access shared objects. Owned objects are only accessible by their owner. Objects are not bound to a specific contract for access.

## Access control patterns

**Solidity:** Uses identity/role-based access control through `Ownable` and `AccessControl` contracts. Permissions are checked against `msg.sender`.

**Move:** Uses capability-based access control through owned objects. A capability object grants the holder permission to perform an action.

```move
/// Grants the owner the right to create new users in the system.
public struct AdminCap {}

/// Creates a new user in the system.
public fun new(_: &AdminCap, ctx: &mut TxContext): User {
    User { id: object::new(ctx) }
}
```

Instead of checking `msg.sender` against a role mapping, Move functions require a capability object as a parameter. Only the holder of the capability can call the function.

## Contract upgrades

**Solidity:** Uses proxy contracts that forward user transactions to an implementation contract. The proxy address stays the same while the implementation can be swapped.

**Move:** New contracts must be layout-compatible with the old one. Sui does not use proxy contracts. Upgrades are controlled through an `UpgradeCap`.

## State mutation

**Solidity:** State is mutated by sending transactions through a compile-time ABI interface. The ABI defines the function signatures available on the contract.

**Move:** State is mutated by sending transactions through runtime PTB construction. PTBs allow chaining multiple contract calls together.

## Object ownership types

- **Address-owned objects:** Single address ownership. Transferable without smart contract interaction.
- **Shared objects:** Publicly accessible objects anyone can use.

## Mutating objects

Logic is defined in the contract. Data is stored in Move objects. The owner invokes contract functions via PTB. The protocol checks ownership at the protocol level.

## Programmable transaction blocks (PTBs)

PTBs give builders the ability to chain contract calls together with atomicity guarantees during runtime. A Sui PTB can have up to 1,024 different contract calls.

On Ethereum, each call is its own transaction and is not atomic across calls. On Sui, PTBs allow calling any number of functions within a single transaction, and the entire batch is atomic.

## Standards mapping

| Purpose | Ethereum | Sui |
|---------|----------|-----|
| Token standards | ERC-20, ERC-721, ERC-1155 | Currency Standard, Closed-Loop Token |

## Development environment

| Ecosystem | Tools |
|-----------|-------|
| Ethereum | Hardhat, Foundry |
| Sui | Move VSCode extension |

## Technical comparisons

| Feature | Sui | Ethereum |
|---------|-----|----------|
| Signatures | Ed25519, secp256k1, secp256r1 | secp256k1 |
| Consensus | DPoS | PoS |
| VM / Language | MoveVM, Move Lang | EVM, Solidity, Vyper |
| Structure | DAG | Blocks |
| Parallel execution | Transactions can be parallel | Every transaction sequentially run |
| Contract mutability | Native mutable and immutable support using upgrade capabilities | Not native, requires auditing Solidity code |
| Composability | Call any number of functions within single transaction using PTBs, atomic | Each call is its own transaction, not atomic |
| Token royalties | Enforced by the chain | Only enforceable by marketplaces |
