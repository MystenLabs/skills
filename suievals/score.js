#!/usr/bin/env node
/**
 * Turn a file of grades into a card, and print the per-pillar report.
 *
 * The arithmetic is here rather than in the runbook because it is the part a model
 * grading itself gets wrong in a way that still looks right: a pooled pass rate
 * instead of the mean of four pillars, a denominator that counts only the
 * expectations it chose to grade, a score averaged over evals instead of over
 * expectations. Every one of those produces a plausible number.
 *
 *   node suievals/score.js --grades my-grades.json
 *   node suievals/score.js --grades my-grades.json --out suievals/results/opus-5-with-skills.json
 *
 * The grades file is what `node suievals/list.js --template` prints, filled in:
 * one boolean per expectation, in the order the expectations are written.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { discover, loadPillars, manifest, score, tally } from "./lib/suite.js";
import { validateCard } from "./lib/card.js";

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
};

const gradesPath = opt("grades");
if (!gradesPath) {
  console.error("Usage: node suievals/score.js --grades <file.json> [--out <card.json>]");
  console.error("Start from: node suievals/list.js --template > my-grades.json");
  process.exit(2);
}

let input;
try { input = JSON.parse(readFileSync(gradesPath, "utf8")); }
catch (err) { console.error(`Cannot read ${gradesPath}: ${err.message}`); process.exit(2); }

const { evals, nested } = discover();
const { pillars, ids } = loadPillars();
const suite = manifest(evals);
const byId = new Map(evals.map((e) => [e.id, e]));

const grades = input.grades ?? {};
const fatal = [];

// Reject before scoring. A wrong-length grade array silently changes the
// denominator, and the resulting card is a number nobody can reproduce.
for (const [id, g] of Object.entries(grades)) {
  const e = byId.get(id);
  if (!e) { fatal.push(`"${id}" is not an eval in this suite. Ids are qualified, like "object-model/1".`); continue; }
  if (!Array.isArray(g) || g.some((v) => typeof v !== "boolean")) {
    fatal.push(`"${id}" must be an array of booleans, one per expectation.`); continue;
  }
  if (g.length !== e.count) {
    fatal.push(`"${id}" has ${g.length} grades; the eval has ${e.count} expectations.`);
  }
}
if (fatal.length) {
  console.error(`${fatal.length} problem${fatal.length === 1 ? "" : "s"} in ${gradesPath}:\n`);
  for (const p of fatal) console.error(`  - ${p}`);
  process.exit(1);
}

const { pillars: counts, perEval, total } = tally(evals, grades, ids);
const required = evals.filter((e) => e.pillar !== "unmapped");
const partial = perEval.length < required.length;

const card = {
  suievals_card: 1,
  model: input.model ?? null,
  skills: input.skills ?? null,
  harness: input.harness ?? "self-report",
  graded_by: input.graded_by ?? null,
  manifest: suite,
  recorded_at: new Date().toISOString(),
  submitted_by: opt("submitted-by") ?? input.submitted_by ?? null,
  notes: opt("notes") ?? input.notes ?? null,
  ...(partial ? { partial: true } : {}),
  pillars: counts,
  total,
  evals: perEval.map((r) => ({ id: r.id, pass: r.pass, of: r.of })),
};

// ── The report the public page asks for ────────────────────────────────────
const pct = (p) => (p.total ? `${((100 * p.pass) / p.total).toFixed(1)}%` : "—");
console.log(`Suite ${suite} · ${card.model ?? "(no model named)"} · ${card.skills === "none" ? "no skills in context" : "with the Sui skills"}`);
console.log(`Graded by ${card.graded_by ?? "(unstated)"}\n`);
console.log("pillar          expectations        share");
for (const p of pillars) {
  const c = counts[p.id];
  console.log(`${p.name.padEnd(15)} ${String(c.pass).padStart(4)} of ${String(c.total).padEnd(5)}     ${pct(c).padStart(6)}`);
}
console.log(`\nScore ${(100 * score(counts, ids)).toFixed(1)}% — the mean of the four pillars.`);
console.log(`Pooled ${pct(total)} (${total.pass} of ${total.total} expectations), which is not the score: see suievals/lib/suite.js.`);

const missed = perEval.filter((r) => r.pass < r.of).sort((a, b) => (a.pass / a.of) - (b.pass / b.of));
console.log(`\nMissed ${missed.length} of ${perEval.length} evals, worst first:`);
for (const r of missed) {
  const e = byId.get(r.id);
  console.log(`  ${r.id.padEnd(40)} ${r.pass}/${r.of}${e?.name ? `  ${e.name}` : ""}`);
}
if (partial) {
  console.log(`\nThis run covers ${perEval.length} of ${required.length} evals, so the card is marked partial`);
  console.log("and the board will show it rather than rank it. A partial run is not a lower score.");
}
if (nested.length) console.log(`\nNot in the suite: ${nested.join(", ")} — see suievals/lib/suite.js.`);

// ── Write it ──────────────────────────────────────────────────────────────
const out = opt("out");
if (!out) {
  console.log("\nNo --out given, so no card was written. Add one to submit:");
  console.log("  node suievals/score.js --grades <file> --out suievals/results/<model>-<with|no>-skills.json");
  process.exit(0);
}

const problems = validateCard(card, { evals, manifest: suite, pillarIds: ids });
if (problems.length) {
  console.error(`\nThe card is not valid, so it was not written:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
writeFileSync(out, JSON.stringify(card, null, 2) + "\n");
console.log(`\nCard written to ${out}. Open a pull request with it.`);
