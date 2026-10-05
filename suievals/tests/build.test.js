#!/usr/bin/env node
/**
 * The generated catalogue and cards have to agree with each other.
 *
 * The bug this exists to stop: eval ids are only unique within a skill --
 * twenty skills number theirs 1, 2, 3 -- so keying a Map on the bare id kept
 * whichever skill was read last, and every card's pillar breakdown came out of
 * the wrong pillars. It looked plausible: the totals still summed to 158, so
 * nothing was obviously broken. Security showed 79 of a 16-eval pillar.
 */

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { PILLAR_OF, PILLAR_IDS } from "../pillars.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..");

const need = [join(OUT, "evals", "index.json"), join(OUT, "results", "index.json")];
for (const f of need) {
  if (!existsSync(f)) {
    console.error(`${f} missing. Run: node suievals/build.js --skills .`);
    process.exit(1);
  }
}

const cat = JSON.parse(readFileSync(need[0], "utf8"));
const res = JSON.parse(readFileSync(need[1], "utf8"));

// ── The catalogue ──
const ids = cat.evals.map((e) => e.id);
assert.equal(new Set(ids).size, ids.length,
  `eval ids must be unique across skills; ${ids.length - new Set(ids).size} collide`);
for (const e of cat.evals) {
  assert.ok(e.id.startsWith(`${e.skill}/`), `${e.id} is not qualified by its skill`);
  assert.equal(PILLAR_OF[e.skill], e.pillar, `${e.skill} is in ${e.pillar} but maps to ${PILLAR_OF[e.skill]}`);
}
const counts = Object.fromEntries(cat.pillars.map((p) => [p.id, p.count]));
for (const p of PILLAR_IDS) {
  const actual = cat.evals.filter((e) => e.pillar === p).length;
  assert.equal(counts[p], actual, `pillar ${p} claims ${counts[p]} evals, catalogue has ${actual}`);
}
assert.equal(cat.evals.length, Object.values(counts).reduce((a, b) => a + b, 0),
  "every eval must belong to exactly one pillar");

// ── The cards ──
//
// These assertions were written when an eval passed or failed as a whole, so they
// compared a run's denominator with the pillar's eval count. Scoring counts
// expectations now -- four models sat at 0 of 158 under all-or-nothing, which told
// you nothing about which was closer -- so the denominator is the pillar's
// expectation count, and a run may fall slightly under it where the judge could not
// grade something. What must still hold is that it never goes over: exceeding the
// pillar is the signature of the id collision this file exists to catch, where
// evals from one skill were counted into another skill's pillar.
assert.equal(res.manifest, cat.manifest, "results were generated against a different eval set");

const expected = Object.fromEntries(PILLAR_IDS.map((p) => [p, 0]));
for (const e of cat.evals) if (expected[e.pillar] !== undefined) expected[e.pillar] += e.expectations;
const suiteExpectations = Object.values(expected).reduce((a, b) => a + b, 0);

for (const run of res.runs) {
  for (const p of PILLAR_IDS) {
    const s = run.pillars[p];
    assert.ok(s, `${run.name} has no ${p} score`);
    assert.ok(s.total <= expected[p],
      `${run.name}: ${p} scored out of ${s.total}, but the pillar only holds ${expected[p]} expectations`);
    assert.ok(s.pass <= s.total, `${run.name}: ${p} passed ${s.pass} of ${s.total}`);
  }
  const summed = PILLAR_IDS.reduce((n, p) => n + run.pillars[p].pass, 0);
  assert.equal(summed, run.total.pass, `${run.name}: pillars sum to ${summed}, total says ${run.total.pass}`);
  const summedOf = PILLAR_IDS.reduce((n, p) => n + run.pillars[p].total, 0);
  assert.equal(summedOf, run.total.total, `${run.name}: pillar denominators sum to ${summedOf}, total says ${run.total.total}`);

  // build.js excludes a run covering less than 90% of the suite, so anything
  // published is close to complete. A run far under that got through a hole.
  assert.ok(run.total.total >= suiteExpectations * 0.9,
    `${run.name}: scored out of ${run.total.total} of ${suiteExpectations} expectations, which should have been excluded as incomplete`);

  // `missed` is one entry per eval that was not perfect, so it is bounded by the
  // eval count, not by the expectation count -- the old assertion equated the two.
  assert.ok(run.missed.length <= cat.evals.length,
    `${run.name}: ${run.missed.length} missed entries for ${cat.evals.length} evals`);
  for (const m of run.missed) {
    assert.ok(ids.includes(m.id), `${run.name} missed ${m.id}, which is not in the suite`);
    assert.ok(m.passed < m.of, `${run.name}: ${m.id} is listed as missed with ${m.passed} of ${m.of}`);
  }
}

// A submitted card is a different grading regime and must say so, or the page
// ranks a model that marked its own paper beside one that did not.
for (const run of res.runs.filter((r) => r.submitted)) {
  assert.ok(run.scoring && run.scoring !== "unknown",
    `${run.name} is a submitted card with no grading regime recorded`);
  assert.equal(typeof run.withSkills, "boolean", `${run.name} does not say whether the skills were loaded`);
}

// A pillar scored out of nothing is a join that failed, not a model that failed.
//
// This is the assertion the old all-or-nothing version of this file caught by
// accident -- it compared a run's denominator with the pillar's eval count, so a
// zero denominator was a mismatch. Counting expectations made the comparison an
// inequality, and `0 <= 31` passes. Stated directly so it cannot be lost again.
for (const run of res.runs) {
  for (const p of PILLAR_IDS) {
    assert.ok(run.pillars[p].total > 0,
      `${run.name}: the ${p} pillar is scored out of 0 while the suite holds ${expected[p]} expectations. `
      + "A published run joined to no eval in that pillar, which means it was scored against a different version of the suite.");
  }
}

// A run that did not execute is excluded rather than published as a low score.
for (const r of res.runs) {
  assert.ok(r.total.pass > 0, `${r.name} passed nothing and should have been excluded`);
}

console.log(`catalogue: ${cat.evals.length} evals, ${cat.pillars.length} pillars, ids unique`);
for (const p of cat.pillars) console.log(`   ${p.id.padEnd(13)} ${String(p.count).padStart(3)}`);
console.log(`cards: ${res.runs.length} run(s), ${(res.incomplete || []).length} excluded`);
console.log("all suievals build tests passed");
