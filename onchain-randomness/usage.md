# API and Usage Patterns

> Source: [docs.sui.io](https://docs.sui.io)

---

## Random object

The `Random` object is a shared object at reserved address `0x8`. It serves as the foundation for all onchain randomness operations on Sui.

- `Random` is immutable for transactions. Any attempt to modify it results in transaction failure.
- Pass `Random` as a reference (`&Random`) to functions that need randomness.

## RandomGenerator

`RandomGenerator` is a pseudorandom generator (PRG) created from `Random` within individual functions.

- Must be instantiated locally within the consuming module.
- Never pass `RandomGenerator` as a function parameter. Always create it internally.

## Move API

The `random.move` module provides the official APIs:

| Function | Description |
|----------|-------------|
| `new_generator(r: &Random, ctx: &mut TxContext): RandomGenerator` | Creates a new pseudorandom generator from the `Random` object. |
| `generate_u128(&mut generator)` | Generates a random `u128` value. |
| `generate_u8_in_range(&mut generator, min: u8, max: u8)` | Generates a random `u8` within the specified inclusive range. |

## Basic implementation example

A dice roll function that generates a random value between 1 and 6:

```move
entry fun roll_dice(r: &Random, ctx: &mut TxContext): Dice {
    let mut generator = new_generator(r, ctx);
    Dice { value: random::generate_u8_in_range(&mut generator, 1, 6) }
}
```

Key points:
- The function is declared as `entry` (not `public`) to prevent composition attacks.
- `RandomGenerator` is created locally inside the function body.
- The `Random` object is passed by reference.

## TypeScript integration

Pass the `Random` object when calling randomness-consuming Move functions from TypeScript:

```typescript
const tx = new Transaction();
tx.moveCall({
    target: "${PACKAGE_ID}::example::roll_dice",
    arguments: [tx.object.random()]
});
```

Use `tx.object.random()` to reference the `Random` object at address `0x8`.

## Per-transaction resource limits

Each transaction has limited resources that constrain what randomness-consuming functions can do:

- Gas budget
- Number of new objects created
- Objects accessible (including dynamic fields)
- Events emitted
- UIDs generated, deleted, or transferred
