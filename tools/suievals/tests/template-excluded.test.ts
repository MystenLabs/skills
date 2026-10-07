#!/usr/bin/env -S npx tsx
/**
 * The scaffold is not a skill, and must not be scored like one.
 *
 * `template` is the directory a new skill is copied from. It ships an evals.json
 * so the copy starts with one, and the runner discovered it the same way it
 * discovers everything else, so the scaffold's placeholder questions were graded
 * alongside real ones. "The output follows the skill's rules" is one of them,
 * and no model has ever satisfied it -- correctly, because there are no rules
 * yet. Of the three expectations in the entire suite that no model has ever met,
 * one was this.
 *
 * Asking for it by name still runs it, because that is somebody working on the
 * scaffold on purpose rather than the suite sweeping it up.
 */

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "skills-discovery-"));
for (const skill of ["accessing-data", "template", "frontend-apps"]) {
  mkdirSync(join(root, skill, "evals"), { recursive: true });
  writeFileSync(
    join(root, skill, "evals", "evals.json"),
    JSON.stringify([{ id: `${skill}-1`, prompt: "q", expectations: ["e"] }]),
  );
}

async function discover(
  env: Record<string, string> = {},
  argv: string[] = [],
): Promise<string[]> {
  const savedEnv = { ...process.env };
  const savedArgv = process.argv;
  Object.assign(process.env, { SKILLS_DIR: root, ...env });
  // --skill is a CLI flag, not an environment variable, and both it and the
  // exclusion are read once at import, so each case needs a fresh module.
  process.argv = [savedArgv[0], savedArgv[1], ...argv];
  const mod = await import(`../src/run-skills-eval.js?t=${Math.random()}`);
  const out = (mod.discoverEvalFiles() as Array<{ skill: string }>).map((f) => f.skill).sort();
  process.env = savedEnv;
  process.argv = savedArgv;
  return out;
}

try {
  const all = await discover({});
  assert.ok(all.includes("accessing-data"), `real skills are still discovered: ${JSON.stringify(all)}`);
  assert.ok(all.includes("frontend-apps"), `real skills are still discovered: ${JSON.stringify(all)}`);
  assert.ok(!all.includes("template"), `the scaffold must not be scored: ${JSON.stringify(all)}`);

  const asked = await discover({}, ["--skill", "template"]);
  assert.deepEqual(asked, ["template"], "asking for the scaffold by name still runs it");

  const opted = await discover({ EVAL_INCLUDE_TEMPLATE: "1" });
  assert.ok(opted.includes("template"), "the opt-out puts it back");

  console.log("template: the scaffold is not scored, and is still reachable on purpose");
} finally {
  rmSync(root, { recursive: true, force: true });
}
