#!/usr/bin/env -S npx tsx
/**
 * The numbers that decide whether a difference is real.
 *
 * Every result this suite has published came from a single run, so a 0.3 point
 * gap between two configurations was reported as if it meant something. These
 * pin the estimators against values worked by hand, including the worked example
 * from the report that motivated them.
 */

import assert from "node:assert/strict";
import { passAtK, passPowK, wilson, spread, summarise } from "../src/stats.js";

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${b}, got ${a}`);

// ── pass@k ────────────────────────────────────────────────────────────────
close(passAtK(10, 0, 3), 0);                       // never succeeded
close(passAtK(10, 10, 3), 1);                      // always succeeded
// 1 success in 10, drawing 3: 1 - C(9,3)/C(10,3) = 1 - 84/120 = 0.3
close(passAtK(10, 1, 3), 0.3, 1e-12);
// k = 1 is just the observed rate.
close(passAtK(10, 4, 1), 0.4, 1e-12);
assert.throws(() => passAtK(3, 1, 5), /needs at least 5 samples/,
  "asking for pass@5 from 3 samples is an error, not a silent extrapolation");

// ── pass^k, and the gap the report is about ──────────────────────────────
// "An agent that succeeds on 75% of its individual trials ... pass@3 is 98.4%,
// pass^3 is 42.1%." Both reproduced here, because that gap is the whole argument.
close(Math.round(passPowK(100, 75, 3) * 1000) / 1000, 0.422);
assert.ok(passAtK(100, 75, 3) > 0.98, `pass@3 for a 75% agent should exceed 98%, got ${passAtK(100, 75, 3)}`);
assert.ok(
  passAtK(100, 75, 3) - passPowK(100, 75, 3) > 0.5,
  "the optimistic and pessimistic bounds must diverge; shipping on the first is the failure the report describes",
);
close(passPowK(10, 10, 5), 1);
close(passPowK(10, 0, 5), 0);

// ── Wilson intervals ─────────────────────────────────────────────────────
{
  // The report's example: a nominal 90% from five trials hides a wide interval.
  const w = wilson(45, 50);
  assert.ok(w.low > 0.78 && w.high < 0.96, `50 trials should be tight-ish: ${JSON.stringify(w)}`);
  const few = wilson(4.5 | 0, 5);
  assert.ok(few.high - few.low > 0.4, `5 trials must report a wide interval, got ${JSON.stringify(few)}`);
  assert.ok(few.low < 0.6, "and that interval must reach well below the point estimate");
}
{
  // Never outside [0,1], which is where the normal approximation breaks.
  for (const [s, t] of [[0, 10], [10, 10], [1, 1], [0, 1]] as const) {
    const w = wilson(s, t);
    assert.ok(w.low >= 0 && w.high <= 1, `${s}/${t} produced ${JSON.stringify(w)}`);
    assert.ok(w.low <= w.high);
  }
  assert.deepEqual(wilson(0, 0), { low: 0, high: 0 }, "no trials is not an interval");
}

// ── Spread ───────────────────────────────────────────────────────────────
{
  const s = spread([0.5, 0.5, 0.5]);
  close(s.sd, 0);
  close(s.cv, 0);
}
{
  // Sample standard deviation, n-1. Population sd of [2,4,4,4,5,5,7,9] is 2;
  // the sample sd is larger.
  const s = spread([2, 4, 4, 4, 5, 5, 7, 9]);
  close(Math.round(s.mean * 1e9) / 1e9, 5);
  assert.ok(s.sd > 2 && s.sd < 2.2, `sample sd should exceed the population sd of 2, got ${s.sd}`);
}
assert.deepEqual(spread([]), { mean: 0, sd: 0, cv: 0 });
assert.deepEqual(spread([0.4]), { mean: 0.4, sd: 0, cv: 0 },
  "one sample has no spread, and must not claim one");

// ── The summary, on a run that looks like ours ──────────────────────────
{
  const evals = [
    { id: "a", passed: 3, samples: 3 },   // solid
    { id: "b", passed: 0, samples: 3 },   // never
    { id: "c", passed: 1, samples: 3 },   // flaky
    { id: "d", passed: 2, samples: 3 },   // flaky
  ];
  const s = summarise(evals, [0.44, 0.46, 0.45], 3);
  assert.equal(s.alwaysPass, 1);
  assert.equal(s.neverPass, 1);
  assert.equal(s.flaky, 2, "the flaky ones are where a single run reports wrongly");
  assert.equal(s.passAtK, 0.75, "three of four succeed at least once in three attempts");
  assert.ok(s.passPowK < s.passAtK, "the pessimistic bound is never above the optimistic one");
  assert.ok(s.noiseFloor.sd > 0 && s.noiseFloor.sd < 0.02,
    `a tight set of scores should report a small noise floor, got ${s.noiseFloor.sd}`);
}

console.log("stats: pass@k and pass^k reproduce the report's worked example, intervals stay in range");

// ── The shared sampling helper ───────────────────────────────────────────
// Three runners needed sampling. Three bespoke loops is three places for the
// arithmetic to drift, so they share this one.
{
  const { sampleRuns, sampleCount } = await import("../src/stats.js");

  let calls = 0;
  const one = await sampleRuns(1, async () => { calls += 1; return { v: 0.5 }; }, (r) => r.v);
  assert.equal(calls, 1, "k=1 runs once");
  assert.equal(one.samples, null, "and reports no spread, because one attempt has none");
  assert.deepEqual(one.first, { v: 0.5 });

  const vals = [0.4, 0.5, 0.6];
  const many = await sampleRuns(3, async (i) => ({ v: vals[i] }), (r) => r.v);
  assert.equal(many.attempts.length, 3);
  assert.deepEqual(many.first, { v: 0.4 }, "the first attempt is what existing consumers read");
  assert.equal(many.samples!.k, 3);
  assert.equal(many.samples!.scored, 3);
  assert.ok(Math.abs(many.samples!.mean - 0.5) < 1e-9);
  assert.ok(many.samples!.sd > 0, "a spread of attempts has a spread");

  // An attempt that could not be scored is excluded, not counted as zero. Counting
  // it would read as the model failing when the harness did.
  const withError = await sampleRuns(3, async (i) => ({ v: i === 1 ? null : 0.8 }), (r) => r.v);
  assert.equal(withError.samples!.scored, 2, "only scored attempts count");
  assert.ok(Math.abs(withError.samples!.mean - 0.8) < 1e-9, "and the error does not drag the mean down");

  // The switch every pipeline reads.
  assert.equal(sampleCount(["node", "x"]), 1, "default is a single attempt");
  assert.equal(sampleCount(["node", "x", "--samples", "10"]), 10);
  assert.equal(sampleCount(["node", "x", "--samples", "--other"]), 1, "a missing value is not a sample count");
  assert.equal(sampleCount(["node", "x", "--samples", "0"]), 1, "zero attempts is not a run");
}

console.log("stats: the shared sampler runs k attempts and never scores an error as zero");
