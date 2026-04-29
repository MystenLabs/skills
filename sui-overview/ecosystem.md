# The Sui Stack and Ecosystem

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
