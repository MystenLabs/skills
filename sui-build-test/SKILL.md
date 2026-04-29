---
name: sui-build-test
description: >
  Building, testing, and IDE setup for Sui Move. Use this skill when the user needs
  to build Move code, write or run tests, set up Move Analyzer or other editor
  tooling, debug test failures, check code coverage, or configure code formatting.
  Also use when the user asks about sui move build, sui move test, test_scenario,
  Move Trace Debugger, coverage reports, or the Move Analyzer VS Code extension.
---

# Building, Testing & IDE Setup

> **Source constraint:** All information sourced exclusively from [docs.sui.io](https://docs.sui.io) and [move-book.com](https://move-book.com).

## IDE and editor setup

### VS Code with Move Analyzer (optional)

Move Analyzer is the official Language Server providing code completion, go-to-definition, diagnostics, and hover documentation.

Do not install or switch Move Analyzer as part of default project setup. Install it only when the user asks for IDE or language-server setup.

```bash
suiup install move-analyzer
```

Then install the "Move Analyzer" extension in VS Code. It activates automatically for `.move` files.

If the `move-analyzer` command is not found after installation, run `suiup switch move-analyzer@testnet` to make it the active default. Verify with `suiup show`.

### Code formatting

```bash
npm i -D prettier @mysten/prettier-plugin-move
```

Add to your Prettier config to format Move files on save.

### Other editors

Community plugins exist for IntelliJ (Sui Move Language Plugin), Emacs (move-mode), Vim (Move.vim), and Zed (Move extension). Web-based options include Play Move (official) and BitsLab IDE (community).

## Building and testing

### Build

```bash
sui move build
```

This compiles all modules, validates types, enforces resource safety, and produces bytecode. Fix any errors before proceeding.

For the canonical hello-world repository, run build commands from `sui-stack-hello-world/move/hello-world`.

### Testing

Write tests in the `tests/` directory or inline with `#[test]` attributes:

```move
#[test]
fun test_create_sword() {
    let mut ctx = tx_context::dummy();
    let sword = forge_sword(&mut ctx);
    assert!(sword.damage == 100);
    // Clean up: transfer or destroy the object
    transfer::public_transfer(sword, @0x0);
}
```

Run tests:

```bash
sui move test                             # run all tests
sui move test --filter test_create        # run tests matching a pattern
sui move test --coverage                  # run with coverage tracking
sui move coverage source --module my_mod  # view coverage for a module
```

### Key test modules

| Module | Purpose |
|---|---|
| `sui::test_scenario` | Multi-transaction, multi-sender test scenarios |
| `std::unit_test` | Assertion macros |
| `sui::test_utils` | Cleanup utilities (`destroy` for test objects) |
| `std::debug` | Debug printing (`debug::print`) |

Aim for 100% code coverage.

### Debugging

- **Move Trace Debugger:** Step-through debugger for Move execution traces with variable inspection.
- **`sui replay`:** Locally re-execute any past onchain transaction and compare effects. Useful for diagnosing production issues.
- **`std::debug::print`:** Print values during test execution.
