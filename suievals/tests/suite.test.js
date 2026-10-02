#!/usr/bin/env node
/**
 * The suite's identity, and the rules a submitted card is held to.
 *
 * The manifest is pinned because it is a contract with two other places: the
 * dashboard that publishes the board computes it independently, and every card
 * already submitted carries it. If this value changes without someone meaning to
 * change it, every published card silently becomes "an older eval set" and the
 * board stops comparing runs it should be comparing.
 */

import assert from "node:assert/strict";
import { discover, loadPillars, manifest, score, tally } from "../lib/suite.js";
import { validateCard } from "../lib/card.js";

const { evals, skills, nested } = discover();
const { ids, pillarOf } = loadPillars();
const suite = manifest(evals);

// ── Identity ────────────────────────────────────────────────────────────────
assert.ok(evals.length > 100, `expected a full suite, found ${evals.length} evals`);
assert.equal(new Set(evals.map((e) => e.id)).size, evals.length, "eval ids must be unique");
for (const e of evals) {
  assert.ok(e.id.includes("/"), `${e.id} is not qualified by its skill`);
  assert.ok(e.count > 0, `${e.id} has no expectations`);
}

// Every skill carrying evals has a pillar, or a score silently excludes it.
const stray = skills.filter((s) => !pillarOf[s]);
assert.deepEqual(stray, [], `these skills have evals but no pillar in suievals/pillars.json: ${stray.join(", ")}`);

// The known omission, asserted so it cannot become an unknown one.
assert.deepEqual(nested.sort(), ["walrus-sites/portal", "walrus-sites/publishing"],
  "the set of skills nesting their evals too deep for discovery changed");

// ── The manifest is stable under things that should not move it ────────────
{
  const shuffled = [...evals].reverse();
  assert.equal(manifest(shuffled), suite, "the manifest must not depend on discovery order");

  const reworded = evals.map((e) => ({ ...e, prompt: e.prompt + " (reworded)" }));
  assert.equal(manifest(reworded), suite, "rewording a prompt is not a change of suite");

  const split = evals.map((e, i) => (i ? e : { ...e, count: e.count + 1 }));
  assert.notEqual(manifest(split), suite, "adding an expectation must change the suite");
}

// ── Scoring is the mean of the pillars, not the pooled rate ────────────────
{
  // Perfect on three small pillars, zero on the large one. Pooling would call this
  // a failure; the mean calls it three quarters, which is what it is.
  const pillars = {
    objects: { pass: 10, total: 10 },
    transactions: { pass: 10, total: 10 },
    building: { pass: 0, total: 500 },
    security: { pass: 10, total: 10 },
  };
  assert.equal(score(pillars, ids), 0.75);
  const pooled = 30 / 530;
  assert.ok(score(pillars, ids) > pooled * 10, "pooling would let the biggest pillar decide");
}
{
  // A pillar nobody graded is left out rather than counted as zero.
  const some = { objects: { pass: 5, total: 10 }, transactions: { pass: 0, total: 0 },
                 building: { pass: 0, total: 0 }, security: { pass: 0, total: 0 } };
  assert.equal(score(some, ids), 0.5);
}

// ── A card is checked, not trusted ─────────────────────────────────────────
const good = (() => {
  const grades = Object.fromEntries(evals.map((e) => [e.id, e.expectations.map(() => true)]));
  const { pillars, perEval, total } = tally(evals, grades, ids);
  return {
    suievals_card: 1, model: "test-model", skills: "sui-skills", harness: "self-report",
    graded_by: "self", manifest: suite, recorded_at: new Date().toISOString(),
    pillars, total, evals: perEval.map((r) => ({ id: r.id, pass: r.pass, of: r.of })),
  };
})();
assert.deepEqual(validateCard(good, { evals, manifest: suite, pillarIds: ids }), [],
  "a card built by the scorer must validate");

const breaks = (mutate, needle) => {
  const card = structuredClone(good);
  mutate(card);
  const problems = validateCard(card, { evals, manifest: suite, pillarIds: ids });
  assert.ok(problems.some((p) => p.includes(needle)),
    `expected a complaint about ${needle}, got: ${JSON.stringify(problems)}`);
};

// An unqualified id is the collision the whole id scheme exists to prevent.
breaks((c) => { c.evals[0].id = "1"; }, "not an eval in this suite");
// A wrong denominator is the failure that still looks like a number.
breaks((c) => { c.evals[0].of += 1; }, "expectations");
breaks((c) => { c.evals[0].pass = c.evals[0].of + 1; }, "not a count");
breaks((c) => { c.evals = c.evals.slice(0, 10); }, "partial run is not a score");
breaks((c) => { c.skills = "maybe"; }, '"skills" must be one of');
breaks((c) => { c.graded_by = null; }, '"graded_by" is required');
breaks((c) => { c.manifest = "deadbeefcafe"; }, "older eval set");
breaks((c) => { c.evals.push(c.evals[0]); }, "appears twice");

// A partial run is publishable when it says so.
{
  const card = structuredClone(good);
  card.evals = card.evals.slice(0, 10);
  card.partial = true;
  const problems = validateCard(card, { evals, manifest: suite, pillarIds: ids });
  assert.deepEqual(problems, [], `a card marked partial is valid: ${JSON.stringify(problems)}`);
}

console.log(`suite: ${evals.length} evals from ${skills.length} skills, manifest ${suite}`);
console.log("suite: identity is stable, scoring averages the pillars, a card is checked not trusted");
