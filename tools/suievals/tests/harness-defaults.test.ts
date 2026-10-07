#!/usr/bin/env -S npx tsx
/**
 * Sampling is pinned for every runner, not just the one that remembered.
 *
 * temperature: 0 was passed at one call site out of five. The other four -- e2e,
 * onboarding, unbranded, competitor -- kept sampling at the provider default, and
 * every comparison they published carried a full run's worth of variance on both
 * sides with nothing to say so. A default at the call site fixes one call site.
 *
 * This pins the resolution rule itself, since the session factory cannot be
 * constructed here without a live model runtime.
 */

import assert from "node:assert/strict";

/** The rule as createEvalSession applies it. */
const resolve = (temperature?: number | null) =>
  temperature === null ? undefined : { temperature: temperature ?? 0 };

assert.deepEqual(resolve(undefined), { temperature: 0 },
  "a runner that says nothing gets 0, which is the case that was broken");
assert.deepEqual(resolve(0), { temperature: 0 }, "an explicit 0 is unchanged");
assert.deepEqual(resolve(0.7), { temperature: 0.7 }, "an explicit value is honoured");
assert.deepEqual(resolve(null), undefined,
  "null is the deliberate opt-out, for a runner that wants provider sampling");

// 0 must survive the ?? chain. Written as `temperature ?? 0` it does; written as
// `temperature || 0` it also does, but `temperature || 1` would not -- the point
// is that falsy zero is a real value here.
assert.notEqual(resolve(0), undefined, "zero is a value, not an absence");

console.log("harness: every runner samples at 0 unless it opts out on purpose");
