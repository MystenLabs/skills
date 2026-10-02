#!/usr/bin/env node
/**
 * The worklist: every eval in the suite, with its expectations.
 *
 * An agent asked to "run the full suite" otherwise has to glob thirty files, work
 * out that two shapes of evals.json are in use, and invent an id scheme -- and the
 * id scheme is the part that goes wrong silently, because ids collide across
 * skills. This prints the suite with the same identity the scorer and the board
 * use.
 *
 *   node suievals/list.js                 a readable worklist
 *   node suievals/list.js --json          machine-readable, for a harness
 *   node suievals/list.js --skill ptbs    one skill
 *   node suievals/list.js --pillar security
 *   node suievals/list.js --template      an empty grades file to fill in
 */

import { discover, loadPillars, manifest } from "./lib/suite.js";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
};

const { evals, skills, nested, unmapped } = discover();
const { pillars, ids } = loadPillars();
const suite = manifest(evals);

const onlySkill = opt("skill");
const onlyPillar = opt("pillar");
const shown = evals.filter((e) =>
  (!onlySkill || e.skill === onlySkill) && (!onlyPillar || e.pillar === onlyPillar));

if (!shown.length) {
  console.error(`No evals matched. Skills: ${skills.join(", ")}. Pillars: ${ids.join(", ")}.`);
  process.exit(1);
}

// An empty grades file, so the shape is never guessed at. One boolean per
// expectation, in the order the expectations are listed.
if (flag("template")) {
  const grades = {};
  for (const e of shown) grades[e.id] = e.expectations.map(() => false);
  console.log(JSON.stringify({
    model: "REPLACE-ME — the model that answered, e.g. claude-opus-5",
    skills: "sui-skills",
    graded_by: "self",
    grades,
  }, null, 2));
  process.exit(0);
}

if (flag("json")) {
  console.log(JSON.stringify({ manifest: suite, pillars, evals: shown, nested, unmapped }, null, 2));
  process.exit(0);
}

console.log(`Sui Evals — suite ${suite}`);
console.log(`${shown.length} eval${shown.length === 1 ? "" : "s"} across ${new Set(shown.map((e) => e.skill)).size} skills`);
if (onlySkill || onlyPillar) console.log(`(filtered; the full suite is ${evals.length} evals)`);
console.log();

for (const p of pillars) {
  const mine = shown.filter((e) => e.pillar === p.id);
  if (!mine.length) continue;
  console.log(`── ${p.name} — ${mine.length} evals, ${mine.reduce((n, e) => n + e.count, 0)} expectations`);
  for (const e of mine) {
    console.log(`\n  ${e.id}${e.name ? `  (${e.name})` : ""}`);
    console.log(`  Q: ${e.prompt.replace(/\s+/g, " ").trim()}`);
    e.expectations.forEach((x, i) => console.log(`     ${i + 1}. ${x}`));
    if (e.graders) {
      const n = Object.keys(e.graders).length;
      console.log(`     [${n} of these ${n === 1 ? "is" : "are"} settled by a written pattern, not by reading]`);
    }
    for (const u of e.sources.filter((u) => String(u).startsWith("http"))) console.log(`     source: ${u}`);
  }
  console.log();
}

const stray = shown.filter((e) => e.pillar === "unmapped");
if (stray.length) {
  console.log(`── Unmapped — ${stray.length} evals in ${unmapped.join(", ")}`);
  console.log("   These have no pillar, so they are excluded from a score.");
  console.log("   Add the skill to suievals/pillars.json to include them.\n");
}
if (nested.length) {
  console.log(`Not in the suite: ${nested.join(", ")} nest their evals a level deeper than`);
  console.log("discovery reaches. See the note in suievals/lib/suite.js.");
}
