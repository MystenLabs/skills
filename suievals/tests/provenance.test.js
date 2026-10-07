#!/usr/bin/env node
/**
 * Official and community cards are different rows, and "official" is not a
 * default anyone falls into.
 *
 * The board labels a card by who measured it. Before provenance was part of the
 * run's identity it was only part of the filename, and the board ignores
 * filenames -- it keys on model and skills. So a contributor re-running a model
 * the pipeline had already measured produced a second row with the same name,
 * whose record page overwrote the first: two measurements, one file, and no way
 * to tell which one survived. The repository's own control runs already have
 * that shape (claude-sonnet-5.json and claude-sonnet-5-faspec.json are both
 * claude-sonnet-5 with sui-skills).
 */

import assert from "node:assert/strict";
import { validateCard, sourceOf, SOURCES } from "../lib/card.js";

// ── Absent means community, which is the claim that asserts less ────────────
assert.equal(sourceOf({}), "community", "a card with no source is not the pipeline's");
assert.equal(sourceOf({ source: undefined }), "community");
assert.equal(sourceOf({ source: "community" }), "community");
assert.equal(sourceOf({ source: "ci" }), "ci");
// Anything unrecognised is community too: sourceOf never promotes.
assert.equal(sourceOf({ source: "official" }), "community");
assert.equal(sourceOf({ source: "CI" }), "community", "not case-insensitive; the value is exact");
assert.deepEqual(SOURCES, ["ci", "community"]);

// ── A bad value is rejected rather than quietly demoted ────────────────────
const base = {
  suievals_card: 1,
  model: "m",
  skills: "none",
  graded_by: "judge:x",
  recorded_at: "2026-10-07T00:00:00.000Z",
  evals: [{ id: "a/1", pass: 1, of: 1 }],
  pillars: { objects: { pass: 0, total: 0 } },
  manifest: "deadbeef",
};
const ctx = {
  evals: [{ id: "a/1", count: 1, pillar: "objects" }],
  manifest: "deadbeef",
  pillarIds: ["objects"],
};

assert.deepEqual(validateCard({ ...base }, ctx), [], "no source is valid");
assert.deepEqual(validateCard({ ...base, source: "ci" }, ctx), [], "ci is valid");
assert.deepEqual(validateCard({ ...base, source: "community" }, ctx), [], "community is valid");
{
  const problems = validateCard({ ...base, source: "offical" }, ctx);
  assert.equal(problems.length, 1, `a typo must be reported, not treated as community: ${JSON.stringify(problems)}`);
  assert.match(problems[0], /"source" must be/);
  assert.match(problems[0], /reserved/, "and must say why ci is not for the taking");
}

console.log("provenance: absent means community, ci is explicit, a bad value is an error");
