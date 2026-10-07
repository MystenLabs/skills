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
import { validateCard, cardWarnings, validateAnswers } from "../lib/card.js";

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
// A stale manifest is a warning, not a problem, and the distinction is the
// point. The message validateCard used to print offered submission as an option
// -- "or submit it knowing the board will mark it as an older eval set" -- while
// the validator that printed it exited 1 and blocked the pull request. build.js
// already refuses to rank such a card on coverage, which is the real protection;
// failing CI as well protected nothing and kept every suievals pull request red.
{
  const stale = structuredClone(good);
  stale.manifest = "deadbeefcafe";
  assert.deepEqual(validateCard(stale, { evals, manifest: suite, pillarIds: ids }), [],
    "a stale card is still a valid card");
  const warnings = cardWarnings(stale, { manifest: suite });
  assert.equal(warnings.length, 1, `expected one warning, got: ${JSON.stringify(warnings)}`);
  assert.match(warnings[0], /older eval set/, "and it says the board will mark it");
  assert.match(warnings[0], /deadbeefcafe/, "naming the suite it was scored against");
  // A current card warns about nothing.
  assert.deepEqual(cardWarnings(good, { manifest: suite }), []);
}
breaks((c) => { c.evals.push(c.evals[0]); }, "appears twice");

// A partial run is publishable when it says so.
{
  const card = structuredClone(good);
  card.evals = card.evals.slice(0, 10);
  card.partial = true;
  const problems = validateCard(card, { evals, manifest: suite, pillarIds: ids });
  assert.deepEqual(problems, [], `a card marked partial is valid: ${JSON.stringify(problems)}`);
}

// ── An answers file is the shape worth submitting ──────────────────────────
// Self-grading is published and then held out of the ranking, so the work of
// running 158 questions buys a row that cannot be read against anything. These
// pin the checks that stop a submission being sent to a judge, one paid call per
// eval, before anyone notices it is unusable.
{
  const full = {
    model: "test-model", skills: "none",
    answers: Object.fromEntries(evals.map((e) => [e.id, "a".repeat(80)])),
  };
  assert.deepEqual(validateAnswers(full, { evals }), [], "a complete answers file is valid");

  const bad = (mutate, needle) => {
    const sub = structuredClone(full);
    mutate(sub);
    const problems = validateAnswers(sub, { evals });
    assert.ok(problems.some((p) => p.includes(needle)),
      `expected a complaint about ${needle}, got: ${JSON.stringify(problems)}`);
  };

  bad((x) => { x.answers["1"] = "a".repeat(80); }, "not an eval in this suite");
  bad((x) => { delete x.answers[evals[0].id]; }, "unanswered");
  bad((x) => { x.skills = "maybe"; }, '"skills" must be');
  bad((x) => { x.model = null; }, '"model" is required');
  // The failure that costs money to discover late: a run where the model said
  // nothing still produces 158 judge calls before anyone sees it is empty.
  bad((x) => { for (const k of Object.keys(x.answers)) x.answers[k] = "n/a"; },
      "run that did not execute");

  // A few short answers are a model being terse, not a run that never happened.
  const terse = structuredClone(full);
  const ids = Object.keys(terse.answers).slice(0, 10);
  for (const id of ids) terse.answers[id] = "no";
  assert.deepEqual(validateAnswers(terse, { evals }), [], "a handful of short answers is not a failed run");
}

console.log("suite: an answers file is checked before anything is sent to a judge");
console.log(`suite: ${evals.length} evals from ${skills.length} skills, manifest ${suite}`);
console.log("suite: identity is stable, scoring averages the pillars, a card is checked not trusted");
