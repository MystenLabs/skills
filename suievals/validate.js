#!/usr/bin/env node
/**
 * Check submitted cards. Run by CI on every pull request that touches
 * suievals/results/, so a malformed card is caught in the pull request rather
 * than by the board quietly dropping it.
 *
 *   node suievals/validate.js                       every card in suievals/results
 *   node suievals/validate.js path/to/card.json     one card
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { REPO, discover, loadPillars, manifest, score } from "./lib/suite.js";
import { validateCard, validateAnswers } from "./lib/card.js";

const { evals } = discover();
const { ids } = loadPillars();
const suite = manifest(evals);

const dir = join(REPO, "suievals", "results");
const named = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const files = named.length
  ? named
  : existsSync(dir)
    // index.json is the built board index, not a submission. build.js already
    // skips it ("not a card"); this did not, so every run of the validator
    // reported six phantom problems against a generated file and exited 1.
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".json") && f !== "index.json")
        .map((f) => join(dir, f))
    : [];

if (!files.length) {
  console.log("No cards to check.");
  process.exit(0);
}

let bad = 0;
for (const file of files) {
  let card;
  try { card = JSON.parse(readFileSync(file, "utf8")); }
  catch (err) { console.error(`✗ ${file}\n    not valid JSON: ${err.message}`); bad += 1; continue; }

  // An answers file is checked against a different contract: it holds what the
  // model said and has not been graded yet, so it has no scores to agree with.
  if (file.endsWith(".answers.json")) {
    const problems = validateAnswers(card, { evals });
    if (problems.length) {
      console.error(`✗ ${file}`);
      for (const p of problems) console.error(`    ${p}`);
      bad += 1;
      continue;
    }
    console.log(`✓ ${file}  ${card.model} · ${card.skills} · ${Object.keys(card.answers).length} answers, awaiting grading`);
    continue;
  }

  const problems = validateCard(card, { evals, manifest: suite, pillarIds: ids });
  if (problems.length) {
    console.error(`✗ ${file}`);
    for (const p of problems) console.error(`    ${p}`);
    bad += 1;
    continue;
  }
  const s = (100 * score(card.pillars, ids)).toFixed(1);
  console.log(`✓ ${file}  ${card.model} · ${card.skills} · graded by ${card.graded_by} · ${s}%`);
}

if (bad) {
  console.error(`\n${bad} of ${files.length} card(s) are not valid.`);
  process.exit(1);
}
console.log(`\n${files.length} card(s) valid against suite ${suite}.`);
