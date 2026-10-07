#!/usr/bin/env node
/**
 * Turn this pipeline's eval reports into the cards the public board reads.
 *
 *   node tools/suievals/emit-cards.js --reports tools/evals/reports --out <skills>/suievals/results
 *
 * The board used to be built here, from reports that only exist here, which made
 * the public page a thing people could read and not a thing they could rebuild.
 * A card is the publishable part: which model, which configuration, and how many
 * expectations it met on each question. No prompts, no responses, no judge
 * transcripts, no internal paths.
 *
 * `source: "ci"` separates these from community submissions. Both are cards and
 * both are public; only one of them is the board's own measurement.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve } from "path";
import { pathToFileURL } from "url";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : fallback;
};
const REPORTS = resolve(arg("reports", "tools/evals/reports"));
const OUT = resolve(arg("out", "suievals/results"));
// The checkout of MystenLabs/skills these cards are published into. The suite is
// read from there rather than reimplemented here: a card is only valid against
// one version of the evals, and the copy that decides which version is the
// public one.
const SKILLS = resolve(arg("skills", join(OUT, "..", "..")));

/**
 * The suite, loaded from the public repo.
 *
 * Every field below that a validator checks -- the eval ids, the expectation
 * count per eval, the pillar an eval belongs to, the manifest -- comes from
 * here. Earlier cards carried none of it: `eval_set` read
 * `report.aggregate.manifest`, which reports do not have, so it was null on
 * every card ever published and all 24 of them failed validation with "scored
 * against suite undefined".
 */
const suiteLib = join(SKILLS, "suievals", "lib", "suite.js");
if (!existsSync(suiteLib)) {
  console.error(`no suite at ${suiteLib}. Pass --skills <checkout of MystenLabs/skills>.`);
  process.exit(1);
}
const { discover, loadPillars, manifest } = await import(pathToFileURL(suiteLib).href);
const { evals: SUITE } = discover(SKILLS);

/**
 * Recover an eval's current id from what the run actually graded.
 *
 * #106 named every eval, replacing per-skill numbers: deepbook-margin/1 became
 * deepbook-margin/deepbook-margin-risk-ratio-thresholds. The questions did not
 * change -- only the key that links an answer to one -- so a report written
 * before that renaming joins the suite on 45 of 158 ids and looks like a
 * measurement of a different suite. It is not. It is the same suite under old
 * names, and discarding it would throw away every frontier model's result over
 * a rename.
 *
 * The expectations are the bridge. A report records the exact expectation text
 * it graded against, and so does the suite, so an eval can be identified by what
 * it asks rather than by what it is called. On the frontier reports this
 * recovers 106 of the 113 ids that no longer resolve, taking coverage from 29%
 * to 97% -- the difference between a card the board marks and a card it ranks.
 *
 * Matching is deliberately strict. A candidate must share at least MIN_OVERLAP
 * of its expectations with the result, measured against whichever side has more
 * so that a short eval cannot match a long one by being a subset of it, and each
 * suite eval is claimed by at most one result. An eval whose expectations were
 * rewritten does not match and is dropped, which is correct: that is a different
 * question now.
 */
const MIN_OVERLAP = 0.8;
const norm = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();

const SUITE_BY_SKILL = new Map();
for (const e of SUITE) {
  if (!SUITE_BY_SKILL.has(e.skill)) SUITE_BY_SKILL.set(e.skill, []);
  SUITE_BY_SKILL.get(e.skill).push({ id: e.id, exps: new Set((e.expectations ?? []).map(norm)) });
}

/** The suite eval a result is about, by id if it still resolves, else by content. */
function resolveEval(r, graded, claimed) {
  const direct = BY_ID.get(`${r.skill}/${r.eval_id}`);
  if (direct) return { eval: direct, recovered: false };

  const mine = new Set(graded.map((g) => norm(g.expectation)).filter(Boolean));
  if (!mine.size) return { eval: null, recovered: false };

  let best = null;
  let bestScore = 0;
  for (const c of SUITE_BY_SKILL.get(r.skill) ?? []) {
    if (claimed.has(c.id)) continue;
    let hit = 0;
    for (const x of mine) if (c.exps.has(x)) hit += 1;
    const score = hit / Math.max(mine.size, c.exps.size, 1);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  if (!best || bestScore < MIN_OVERLAP) return { eval: null, recovered: false };
  return { eval: BY_ID.get(best.id) ?? null, recovered: true };
}
const { ids: PILLAR_IDS } = loadPillars(SKILLS);
const MANIFEST = manifest(SUITE);
const BY_ID = new Map(SUITE.map((e) => [e.id, e]));
// Unmapped evals are not scored, so a card does not have to carry them.
const REQUIRED = SUITE.filter((e) => e.pillar !== "unmapped").map((e) => e.id);

/** The configuration a run was measured in, in the card's vocabulary. */
function skillsOf(meta) {
  const layer = meta?.layer ?? (meta?.skills === "none" ? "baseline" : "with-skills");
  return layer === "with-skills" || layer === "with-skills-mcp" ? "sui-skills" : "none";
}

/** "judge:<model>", or the grader the run actually used. */
function gradedBy(meta) {
  if (meta.scoring === "static") return "static";
  const judge = meta.judge_model ?? meta.judgeModel;
  return judge ? `judge:${String(judge).replace(/^.*\//, "")}` : "judge";
}

function cardFrom(report) {
  const meta = report.metadata ?? {};
  const evals = [];
  const pillars = Object.fromEntries(PILLAR_IDS.map((p) => [p, { pass: 0, total: 0 }]));
  // One suite eval per result: without this a renamed eval could be claimed
  // twice and the denominator would count a question that was asked once.
  const claimed = new Set();
  let recoveredIds = 0;
  for (const r of report.results ?? []) {
    // The catalogue keys an eval as skill/eval_id, and an id that does not match
    // it is silently dropped: every card scored 0 of 0 and the whole board came
    // back empty, which looks like no data rather than a bad join.
    // The judge decides, and an eval it could not grade is unknown rather than
    // failed. Counting ungraded expectations as misses would publish a lower
    // number than the run measured.
    const judged = (r.llmGrades ?? []).filter((g) => g.judged);
    const graded = judged.length
      ? judged
      : (r.staticGrades ?? []).map((g) => ({ pass: g.passed, expectation: g.expectation }));
    if (!graded.length) continue;

    const { eval: e, recovered } = resolveEval(r, graded, claimed);
    if (!e) continue;
    claimed.add(e.id);
    if (recovered) recoveredIds += 1;
    const id = e.id;

    // A card reports an eval over the suite's denominator or not at all. Where
    // the judge graded some of an eval's expectations, publishing the pass count
    // over a shorter denominator states a rate nobody else computed -- which is
    // the thing the card format exists to prevent.
    if (graded.length !== e.count) continue;

    const pass = graded.filter((g) => g.pass).length;
    evals.push({ id, pass, of: e.count });
    if (pillars[e.pillar]) { pillars[e.pillar].pass += pass; pillars[e.pillar].total += e.count; }
  }
  if (!evals.length) return null;

  // Marked rather than ranked, which is what `partial` is for. A run that missed
  // questions is a different measurement from one that answered them badly.
  const covered = new Set(evals.map((e) => e.id));
  const missing = REQUIRED.filter((id) => !covered.has(id));

  return {
    suievals_card: 1,
    source: "ci",
    model: String(meta.model ?? "").replace(/^.*\//, ""),
    skills: skillsOf(meta),
    layer: meta.layer ?? null,
    graded_by: gradedBy(meta),
    grader: meta.scoring ?? "judge",
    tools: Array.isArray(meta.tools) ? meta.tools : [],
    samples: report.aggregate?.sampling?.k ?? 1,
    // Carried so a reader can see a degraded run rather than averaging it in.
    empty_answers: meta.empty_responses ?? 0,
    recorded_at: meta.timestamp ?? new Date().toISOString(),
    manifest: MANIFEST,
    eval_set: MANIFEST,
    pillars,
    ...(missing.length ? { partial: true } : {}),
    // How many evals were identified by their expectations rather than by an id
    // that still resolves. Recorded so a reader can see that a pre-#106 run was
    // re-keyed rather than re-measured.
    ...(recoveredIds ? { recovered_ids: recoveredIds } : {}),
    evals,
  };
}

/** What a card left out, for the log. Never published. */
function dropsFrom(report) {
  let unknown = 0, partlyGraded = 0;
  for (const r of report.results ?? []) {
    const e = BY_ID.get(`${r.skill}/${r.eval_id}`);
    if (!e) continue;
    const judged = (r.llmGrades ?? []).filter((g) => g.judged);
    const graded = judged.length ? judged : (r.staticGrades ?? []).map((g) => ({ pass: g.passed }));
    if (graded.length && graded.length !== e.count) partlyGraded += 1;
  }
  return { unknown, partlyGraded };
}

function main() {
  if (!existsSync(REPORTS)) {
    console.error(`no reports at ${REPORTS}`);
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  let written = 0;
  for (const file of readdirSync(REPORTS).filter((f) => /^skills-eval-results-pi-.+\.json$/.test(f)).sort()) {
    let report;
    try { report = JSON.parse(readFileSync(join(REPORTS, file), "utf8")); } catch { continue; }
    const card = cardFrom(report);
    if (!card) continue;
    const name = file.replace(/^skills-eval-results-pi-/, "").replace(/\.json$/, "");
    writeFileSync(join(OUT, `${name}.json`), JSON.stringify(card, null, 2) + "\n");
    written += 1;
    const d = dropsFrom(report);
    const notes = [
      `${card.evals.length}/${REQUIRED.length} evals`,
      ...(card.recovered_ids ? [`${card.recovered_ids} id(s) recovered by expectation`] : []),
      card.skills,
      `${card.samples} sample(s)`,
      ...(card.partial ? ["partial, so marked rather than ranked"] : []),
      ...(d.unknown ? [`${d.unknown} not in the suite`] : []),
      ...(d.partlyGraded ? [`${d.partlyGraded} only partly graded`] : []),
    ];
    console.log(`  ${name}: ${notes.join(", ")}`);
  }
  console.log(`${written} card(s) written to ${OUT}`);
}

main();
