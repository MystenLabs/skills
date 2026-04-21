---
name: move-unit-testing
description: Use when writing unit tests for Move smart contracts on Sui. Applies to test function naming, assertions, test attributes, context usage, and cleanup patterns. Use whenever user asks to write tests, add tests, or test a Move module.
---

# move-unit-testing

## Overview

AI agents consistently use outdated or suboptimal patterns when writing Move unit tests. This skill covers the correct testing conventions from the official Sui Move code quality checklist and testing documentation.

All patterns sourced from https://move-book.com/guides/code-quality-checklist and https://move-book.com/testing/

## No `test_` Prefix in Test Modules

Test functions inside `_tests` modules should NOT be prefixed with `test_`. The module name already indicates these are tests. Use descriptive names that read as statements.

```move
// WRONG — redundant prefix
module my_package::my_module_tests;

#[test]
fun test_create_pool() { /* ... */ }

#[test]
fun test_swap_fails_on_zero() { /* ... */ }

// CORRECT — descriptive statement names
module my_package::my_module_tests;

#[test]
fun create_pool_with_initial_liquidity() { /* ... */ }

#[test]
fun swap_aborts_on_zero_input() { /* ... */ }
```

## Use `assert_eq!` Instead of `assert!` for Comparisons

`assert_eq!` displays both values on failure, making debugging much easier. Never use `assert!(x == y)` or `assert!(x == y, 0)` for equality checks.

```move
// WRONG — no diagnostic info on failure
assert!(result == 100);
assert!(result == expected_value, 0);

// CORRECT — shows both values on failure
use std::unit_test::assert_eq;

assert_eq!(result, 100);
assert_eq!(result, expected_value);
```

Use plain `assert!` only for boolean conditions where there's nothing to compare:

```move
// assert! is fine for boolean checks
assert!(is_valid);
assert!(vec.length() > 0);
```

## No Abort Codes in Test `assert!`

Do not pass numeric abort codes to `assert!` in tests. They can accidentally match application error codes and confuse debugging.

```move
// WRONG — numeric code may collide with app errors
assert!(is_success, 0);
assert!(balance > 0, 1);

// CORRECT — no abort code
assert!(is_success);
assert!(balance > 0);
```

## Merge `#[test]` and `#[expected_failure]` on One Line

```move
// WRONG — separate attributes
#[test]
#[expected_failure(abort_code = my_app::EInvalidInput)]
fun invalid_input_aborts() { /* ... */ }

// CORRECT — merged on one line
#[test, expected_failure(abort_code = my_app::EInvalidInput)]
fun invalid_input_aborts() { /* ... */ }
```

## Skip Cleanup in `expected_failure` Tests

Tests annotated with `expected_failure` will abort — any cleanup code after the abort point is dead code. Don't call `.end()` or destroy objects after the expected abort.

```move
// WRONG — cleanup after abort is dead code
#[test, expected_failure(abort_code = my_app::EInsufficientBalance)]
fun withdraw_more_than_balance_aborts() {
    let mut scenario = test_scenario::begin(@0xA);
    my_app::withdraw(1000, scenario.ctx());
    scenario.end(); // never reached
}

// CORRECT — let it abort naturally
#[test, expected_failure(abort_code = my_app::EInsufficientBalance)]
fun withdraw_more_than_balance_aborts() {
    let mut scenario = test_scenario::begin(@0xA);
    my_app::withdraw(1000, scenario.ctx());
    // no cleanup needed — test aborts above
}
```

## Use `tx_context::dummy()` for Simple Tests

If a test only needs a `TxContext` and doesn't need multi-transaction simulation, use `tx_context::dummy()` instead of a full `test_scenario`. Reserve `test_scenario` for tests that actually need to simulate multiple transactions, shared objects, or transfers between addresses.

```move
// WRONG — unnecessary overhead for a simple test
#[test]
fun mint_returns_correct_value() {
    let mut scenario = test_scenario::begin(@0xA);
    let item = app::create_item(100, scenario.ctx());
    assert_eq!(item.value(), 100);
    test_utils::destroy(item);
    scenario.end();
}

// CORRECT — dummy context is sufficient
#[test]
fun mint_returns_correct_value() {
    let ctx = &mut tx_context::dummy();
    let item = app::create_item(100, ctx);
    assert_eq!(item.value(), 100);
    test_utils::destroy(item);
}
```

**When to use `test_scenario`:** shared objects, multi-transaction flows, testing transfers between addresses, testing `init` functions, epoch/time manipulation.

**When to use `tx_context::dummy()`:** pure function tests, single-operation tests, anything that just needs a ctx to create objects.

## Use `test_utils::destroy` for Cleanup

Use the standard `test_utils::destroy` function to clean up test objects. Do not write custom `destroy_for_testing` functions.

```move
// WRONG — custom cleanup functions
nft.destroy_for_testing();
app.destroy_for_testing();

// CORRECT — standard destroy
use sui::test_utils::destroy;

destroy(nft);
destroy(app);
```

## Quick Reference

| Pattern | Correct | Common Mistake |
|---------|---------|----------------|
| Test function naming | `create_pool_succeeds()` | `test_create_pool()` |
| Equality assertions | `assert_eq!(x, 100)` | `assert!(x == 100, 0)` |
| Boolean assertions | `assert!(is_valid)` | `assert!(is_valid, 0)` |
| Test attributes | `#[test, expected_failure(...)]` | Separate `#[test]` and `#[expected_failure]` |
| Expected failure cleanup | Let it abort, no cleanup | Calling `.end()` after abort |
| Simple test context | `tx_context::dummy()` | Full `test_scenario` for simple tests |
| Object cleanup | `test_utils::destroy(obj)` | `obj.destroy_for_testing()` |
