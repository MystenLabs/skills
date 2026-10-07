#!/usr/bin/env -S npx tsx
/**
 * The harness decides an argument it should not.
 *
 * Eval sessions ran with `tools: []`, so every published number describes an agent
 * that cannot open a file. The Agent Skills standard puts situational detail in
 * references/ and expects the agent to fetch it when the instructions point there;
 * with no tools, level 3 never loads and following the standard removes material
 * rather than deferring it. Rewriting accessing-data to the letter of the guidance
 * scored 5.4 points lower here for exactly that reason, which is a fact about the
 * harness and was being read as a fact about the guidance.
 *
 * These pin the resolution rule and the thing that makes the result interpretable:
 * whether the model, given the ability, actually used it.
 */

import assert from "node:assert/strict";

const EVAL_TOOLS = ["read", "grep", "ls"];
const resolve = (on: boolean) => (on ? EVAL_TOOLS : []);

// ── On by default, after one run settled it ───────────────────────────────
// accessing-data scored 26.8% without tools and 87.5% with them, and the eval that
// had failed 0 of 7 across four authoring treatments passed 7 of 7. A suite that
// forbids the agent from opening a file measures its own restriction.
const defaultOn = (argv: string[], env: string | undefined) =>
  argv.includes("--no-tools") || env === "0" ? false : true;

assert.equal(defaultOn([], undefined), true, "a run that says nothing gets tools");
assert.equal(defaultOn(["--no-tools"], undefined), false, "and the old behaviour is reproducible");
assert.equal(defaultOn([], "0"), false, "by flag or by environment");
assert.equal(defaultOn([], "1"), true);
assert.deepEqual(resolve(true), EVAL_TOOLS, "read is the minimum for references/ to resolve");
assert.deepEqual(resolve(false), [], "and off means genuinely none");

// ── Pre-tools cards are a different regime, not a lower score ─────────────
// 26.8% against 87.5% on the same skill. Ranking them in one column compares
// harnesses while appearing to compare models.
{
  const regime = (grader: string, tools: string[] | undefined) =>
    Array.isArray(tools) && tools.length ? grader : `${grader}, no tools`;
  assert.equal(regime("judge", EVAL_TOOLS), "judge");
  assert.equal(regime("judge", []), "judge, no tools");
  assert.equal(regime("judge", undefined), "judge, no tools",
    "a run predating the flag recorded nothing and was tool-free");
  assert.notEqual(regime("judge", EVAL_TOOLS), regime("judge", []),
    "which is the whole point: they must not share a column");
}

// ── A run with tools and no calls is not a test of progressive disclosure ──
// This is the case that would otherwise be reported as "the standard does not
// help": the model was able to fetch and chose not to, which is a different
// finding from the material being unreachable.
{
  const classify = (withTools: boolean, calls: number) =>
    !withTools ? "no-tools"
      : calls === 0 ? "tools-unused"
      : "tools-used";

  assert.equal(classify(false, 0), "no-tools");
  assert.equal(classify(true, 0), "tools-unused",
    "enabled but never reached for: comparable with a no-tools run, and must say so");
  assert.equal(classify(true, 12), "tools-used");

  // The distinction only exists if the calls are counted. Without the counter the
  // first two are indistinguishable in the output.
  assert.notEqual(classify(true, 0), classify(true, 1));
}

// ── The working directory has to make the skill's own paths resolve ───────
{
  const cwdFor = (withTools: boolean, skillsDir: string | null, skill: string) =>
    withTools && skillsDir ? `${skillsDir}/${skill}` : undefined;

  assert.equal(cwdFor(true, "/tmp/skills", "accessing-data"), "/tmp/skills/accessing-data",
    "a skill saying references/grpc.md must find it relative to its own directory");
  assert.equal(cwdFor(false, "/tmp/skills", "accessing-data"), undefined,
    "without tools there is nothing to resolve");
  assert.equal(cwdFor(true, null, "accessing-data"), undefined,
    "and no checkout means no working directory to offer");
}

console.log("tools: on by default, reproducibly off, and pre-tools cards kept in their own regime");
