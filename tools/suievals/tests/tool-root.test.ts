#!/usr/bin/env -S npx tsx
/**
 * A layer without the skills must not be able to read them off disk.
 *
 * The layer decided what went into the system prompt and nothing else. The tools
 * were rooted in the skill's own directory whenever tools were on, for every
 * layer, so a baseline run got no skill text in context and then opened SKILL.md
 * with ls and read.
 *
 * It is not a theoretical hole. A baseline claude-haiku-4-5 run made 1188 tool
 * calls across 456 of 474 attempts and scored 90.6%, against 87.1% with the
 * skills in context; mcp-only made 1205 across 454 and scored 89.5%. Three
 * layers inside 3.5 points, because all three were the same configuration under
 * different names, and the published board was one commit away from reporting
 * that the skills cost a model 3.6 points.
 *
 * Tools stay available in every layer on purpose: the comparison is about what
 * the model can read, not whether it can read at all. So a layer without the
 * skills is rooted in an empty directory, and these pin which layers those are.
 */

import assert from "node:assert/strict";
import { toolRootFor } from "../src/run-skills-eval.js";

const SKILLS = "/checkout/skills";
const EMPTY = "/tmp/eval-no-skills-abc";

// ── The layers that are given the skills are rooted in them ─────────────────
for (const layer of ["with-skills", "with-skills-mcp"]) {
  assert.equal(
    toolRootFor(layer, SKILLS, "accessing-data", EMPTY),
    "/checkout/skills/accessing-data",
    `${layer} reads the skill it was given`,
  );
}

// ── The layers that are not given the skills cannot reach them ──────────────
for (const layer of ["baseline", "mcp-only"]) {
  const root = toolRootFor(layer, SKILLS, "accessing-data", EMPTY);
  assert.equal(root, EMPTY, `${layer} is rooted in the empty directory`);
  assert.ok(!String(root).includes(SKILLS), `${layer} must not see the skills checkout`);
  assert.ok(!String(root).includes("accessing-data"), `${layer} must not see the skill by name`);
}

// ── An unknown layer is treated as not having the skills ────────────────────
// Defaulting the other way would mean a typo in a dispatch silently hands the
// skills to a run that was meant to be without them.
assert.equal(
  toolRootFor("with-skils", SKILLS, "accessing-data", EMPTY), EMPTY,
  "a misspelled layer does not get the skills",
);
assert.equal(toolRootFor("", SKILLS, "accessing-data", EMPTY), EMPTY);

// ── No skills checkout means nothing to root in ─────────────────────────────
assert.equal(
  toolRootFor("with-skills", null, "accessing-data", EMPTY), EMPTY,
  "with no checkout even a with-skills layer falls back to the empty directory",
);
// And with no empty directory either, there is no cwd to set at all, which is
// the no-tools case.
assert.equal(toolRootFor("baseline", SKILLS, "accessing-data", null), null);
assert.equal(toolRootFor("with-skills", null, "accessing-data", null), null);

console.log("tool-root: only a with-skills layer is rooted in the skills checkout");
