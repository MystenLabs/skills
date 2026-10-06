#!/usr/bin/env node
/**
 * What the eval gate does and does not fail on.
 *
 * The gate it replaces was `totalFail > 0` on a single strictly-judged sample.
 * Three consecutive runs of one commit failed on three different sets of
 * expectations, so these pin the margin that makes the new one answerable:
 * three failures out of three is a regression, one out of three is noise.
 */

import assert from "node:assert/strict";
import { compareToBaseline } from "./gate.js";

const base = (pass) => [{ skill: "s", eval_id: "e", grades: [{ expectation: "A", pass }] }];
const run = (passes, samples = 3) => [
  { skill: "s", eval_id: "e", grades: [{ expectation: "A", passes, samples, pass: passes * 2 > samples, reason: "r" }] },
];

// ── A regression has to fail every sample ────────────────────────────────────
{
  const r = compareToBaseline(base(true), run(0));
  assert.equal(r.confirmedRegressions.length, 1, "passed before, fails all three now");
  assert.equal(r.unsupported.length, 0);
}
{
  // This is the case the old rule got wrong: a real drop in the majority, but one
  // sample still passes, so the sample size cannot support calling it breakage.
  const r = compareToBaseline(base(true), run(1));
  assert.equal(r.confirmedRegressions.length, 0, "1 of 3 is inside the noise");
  assert.equal(r.unsupported.length, 1, "but it is reported rather than hidden");
}
{
  const r = compareToBaseline(base(true), run(2));
  assert.equal(r.confirmedRegressions.length, 0, "still the majority; nothing to report");
  assert.equal(r.unsupported.length, 0);
}

// ── A fix has to pass every sample ───────────────────────────────────────────
{
  const r = compareToBaseline(base(false), run(3));
  assert.equal(r.confirmedFixes.length, 1);
  assert.equal(r.confirmedRegressions.length, 0);
}
{
  const r = compareToBaseline(base(false), run(2));
  assert.equal(r.confirmedFixes.length, 0, "2 of 3 is not yet a fix");
  assert.equal(r.unsupported.length, 1);
}
{
  const r = compareToBaseline(base(false), run(0));
  assert.equal(r.confirmedFixes.length, 0);
  assert.equal(r.unsupported.length, 0, "failing before and after is not movement");
}

// ── Nothing to compare against is not breakage ───────────────────────────────
{
  // A renamed id, or an expectation written in this very PR. Treating it as new
  // breakage would make every rename fail the build -- and 111 ids were just
  // renamed in this repo.
  const r = compareToBaseline([{ skill: "s", eval_id: "old-name", grades: [{ expectation: "A", pass: true }] }], run(0));
  assert.equal(r.confirmedRegressions.length, 0);
  assert.equal(r.compared, 0, "no expectation matched the baseline");
}
{
  const r = compareToBaseline([], run(0));
  assert.equal(r.confirmedRegressions.length, 0, "an empty baseline gates nothing");
}
{
  const r = compareToBaseline(undefined, undefined);
  assert.equal(r.compared, 0, "missing inputs must not throw");
}

// ── A baseline recorded before sampling existed ──────────────────────────────
{
  // Older results carry `pass` and no `passes`/`samples`. One sample, so a miss is
  // 0 of 1 and does count -- that is correct: with one sample there is no margin to
  // apply, and the gate should say so rather than silently pass everything.
  const legacy = [{ skill: "s", eval_id: "e", grades: [{ expectation: "A", pass: false }] }];
  const r = compareToBaseline(base(true), legacy);
  assert.equal(r.confirmedRegressions.length, 1);
  assert.equal(r.confirmedRegressions[0].samples, 1);
}

// ── Expectations are matched per skill and per eval ──────────────────────────
{
  // Eval ids repeat across skills in this repo, so a comparison keyed on the id
  // alone would compare one skill's eval against another's.
  const baseline = [
    { skill: "alpha", eval_id: "1", grades: [{ expectation: "A", pass: true }] },
    { skill: "beta", eval_id: "1", grades: [{ expectation: "A", pass: false }] },
  ];
  const results = [
    { skill: "alpha", eval_id: "1", grades: [{ expectation: "A", passes: 3, samples: 3, pass: true, reason: "" }] },
    { skill: "beta", eval_id: "1", grades: [{ expectation: "A", passes: 3, samples: 3, pass: true, reason: "" }] },
  ];
  const r = compareToBaseline(baseline, results);
  assert.equal(r.compared, 2);
  assert.equal(r.confirmedFixes.length, 1, "only beta improved");
  assert.equal(r.confirmedFixes[0].skill, "beta");
  assert.equal(r.confirmedRegressions.length, 0);
}

console.log("gate: three of three is a regression, one of three is noise, a rename is neither");
