#!/usr/bin/env node
/**
 * Builds the two files SUIEVALS serves: the eval catalogue and the results.
 *
 *   evals/index.json    every eval in the suite, with its pillar and how it is
 *                       graded. Generated from the skills repo, so the site
 *                       cannot claim an eval that does not exist.
 *   results/index.json  one card per run. Generated from the per-model result
 *                       files the skills eval already writes, so the
 *                       leaderboard is the same data CI produces rather than a
 *                       second set of numbers that can disagree with it.
 *
 * Usage:
 *   node suievals/build.js --skills . --out suievals
 *
 * Nothing here calls a model. It reads what has already been run.
 */

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { PILLARS, PILLAR_OF, PILLAR_IDS } from "./pillars.js";
import { sourceOf } from "./lib/card.js";
import { kindOf, KINDS } from "./kind.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const SKILLS_DIR = resolve(arg("skills", join(process.env.HOME ?? "", "skills")));
const REPORTS_DIR = resolve(arg("reports", join(REPO, "tools", "evals", "reports")));
const OUT_DIR = resolve(arg("out", join(REPO, "dashboard", "public", "suievals")));

// ── The catalogue ────────────────────────────────────────────────────

/** Every eval the skills repo defines, tagged with its pillar. */
function readCatalogue() {
  const evals = [];
  const unmapped = new Set();
  const skillsSeen = [];

  for (const skill of readdirSync(SKILLS_DIR).sort()) {
    const file = join(SKILLS_DIR, skill, "evals", "evals.json");
    if (!existsSync(file)) continue;

    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch (err) {
      console.error(`  skipped ${skill}: ${err.message}`);
      continue;
    }
    // Two shapes are in use: a bare array, and {skill_name, evals:[...]}.
    const list = Array.isArray(parsed) ? parsed : parsed.evals ?? [];
    if (!list.length) continue;
    skillsSeen.push(skill);

    const pillar = PILLAR_OF[skill];
    if (!pillar) unmapped.add(skill);

    for (const e of list) {
      const expectations = e.expectations ?? [];
      // Ids are only unique within a skill -- twenty skills number their evals
      // 1, 2, 3 -- so the catalogue key is qualified. Keyed on the bare id, a
      // Map keeps whichever skill was read last and the pillar breakdown comes
      // out of a different skill's pillar entirely.
      const localId = e.id ?? String(list.indexOf(e) + 1);
      evals.push({
        id: `${skill}/${localId}`,
        localId: String(localId),
        pillar: pillar ?? "unmapped",
        skill,
        title: String(localId).replace(/[-_]/g, " "),
        // Five recognisably different asks, derived from the prompt and
        // overridable by the eval. Not ETHEVALS' quiz/goal: a "goal" there is a
        // build task with a verified end state, and nothing here is run.
        kind: kindOf(e),
        graded: "hybrid",
        expectations: expectations.length,
        summary: String(e.prompt ?? "").replace(/\s+/g, " ").trim().slice(0, 240),
        sources: e.sources ?? [],
      });
    }
  }
  return { evals, unmapped: [...unmapped], skillsSeen };
}

// ── The cards ────────────────────────────────────────────────────────

/**
 * A model's run, scored per pillar, from the measuring pipeline's own reports.
 *
 * Absent in a public checkout, and that is the point: this repository holds the
 * page, the suite and the published cards, and anyone can rebuild the board from
 * those alone. The raw reports belong to whoever ran the models and paid for the
 * tokens; a card is the part that is worth publishing.
 */
function readRuns(byId, incomplete) {
  const runs = [];
  if (!existsSync(REPORTS_DIR)) return runs;
  const files = readdirSync(REPORTS_DIR)
    .filter((f) => /^skills-eval-results-pi-.+\.json$/.test(f))
    .sort();

  for (const file of files) {
    let d;
    try {
      d = JSON.parse(readFileSync(join(REPORTS_DIR, file), "utf8"));
    } catch {
      continue;
    }
    const results = d.results ?? [];
    if (!results.length) continue;
    // A control run repeats a configuration already on the board to measure how
    // much the score moves on its own. It is the yardstick the deltas are read
    // against, not another card, and publishing it would show the same model
    // twice with two different numbers and no explanation.
    if (d.metadata?.run_tag) continue;

    const pillars = Object.fromEntries(PILLAR_IDS.map((p) => [p, { pass: 0, total: 0 }]));
    const missed = [];
    let pass = 0;
    let total = 0;
    // How much of this run's suite the catalogue recognises. A run scored against
    // a branch that renames evals joins to nothing here, and nothing is not zero.
    let recognised = 0;

    for (const r of results) {
      // The pillar follows from the skill, which is the only mapping that
      // exists; the catalogue lookup is just to confirm the eval is in the
      // published suite.
      const pid = PILLAR_OF[r.skill];
      const known = byId.has(`${r.skill}/${r.eval_id}`);
      if (known) recognised += 1;
      if (!pid || !pillars[pid] || !known) continue;

      // Score expectations, not whole evals.
      //
      // An eval passed only when every one of its expectations did, and with a
      // strict judge across six or so of them that compounds into a verdict that
      // stops describing the model: o3 satisfied 31.5% of expectations and passed
      // 0 of 158 evals. Counting expectations spreads the models apart again --
      // 13% to 62% rather than everything bunched at zero -- and a model that gets
      // five of six right is no longer scored the same as one that gets none.
      const judged = (r.llmGrades ?? []).filter((g) => g.judged);
      const grades = judged.length
        ? judged.map((g) => ({ expectation: g.expectation, ok: g.pass === true }))
        : (r.staticGrades ?? []).map((g) => ({ expectation: g.expectation, ok: g.passed === true }));

      // Every expectation counts. Dropping the ones the verifier calls
      // contradicted or unverifiable was tried here and removed: that report has a
      // high false-positive rate, because its search returns a loosely-related
      // passage and the judge reads it as a contradiction. Five sui-sdks Rust
      // expectations were "contradicted" by the TypeScript docs -- tx.splitCoins
      // quoted against an expectation that explicitly asks for snake_case
      // tx.split_coins -- and "maximum borrowable equals the pool's holdings" was
      // contradicted by a utilization rate belonging to a different module, when
      // the deepbook source asserts exactly the pool's balance.
      //
      // So the report is a work queue for a person, not a filter on a score. An
      // expectation that is genuinely unsourced gets rewritten in the skills repo
      // against what the docs say, which is what happened to deepbook-predict.
      let evalPass = 0;
      let evalTotal = 0;
      for (const g of grades) {
        evalTotal += 1;
        if (g.ok) evalPass += 1;
      }
      if (!evalTotal) continue;

      pillars[pid].total += evalTotal;
      pillars[pid].pass += evalPass;
      total += evalTotal;
      pass += evalPass;
      if (evalPass < evalTotal) {
        missed.push({ id: `${r.skill}/${r.eval_id}`, pillar: pid, skill: r.skill, passed: evalPass, of: evalTotal });
      }
    }
    // A run scored against a different version of the suite is not a run that
    // scored badly.
    //
    // The board joins a result to the catalogue on `skill/eval_id`. A preview run
    // against a branch that renames evals -- which is exactly what the sourcing
    // branch does, turning `object-model/7` into `object-model/dynamic-field-reads`
    // -- matches on some skills and not others. The pillars that matched carry
    // numbers, the pillars that did not read zero, and the card publishes as a
    // model that cannot answer a quarter of Sui. That is how the board came out
    // with an objects pillar scored out of 0 while the suite holds 31 objects evals.
    //
    // The manifest cannot catch this: it is computed from the catalogue, so both
    // sides agree with each other and disagree with the results.
    if (results.length && recognised < results.length * 0.9) {
      incomplete.push({
        model: (d.metadata?.model ?? file).replace(/^.*\//, ""),
        pass, total, of: results.length,
        reason: `only ${recognised} of ${results.length} evals exist in the current suite — `
          + `this run was scored against a different version of it`,
      });
      continue;
    }

    // A run that recorded no pass at all, or covered only part of the suite,
    // did not execute -- o3-pro returned nothing for all 158 and gpt-5.5-pro
    // for 151 of them. Publishing those as 0% cards would read as a model
    // scoring zero rather than a run that never happened.
    if (!total) continue;

    // A run where the model answered nothing is not a run that scored badly.
    // The eval-level guard below used to catch these because an empty answer
    // fails every eval; scoring expectations gives them a few stray passes --
    // the three Gemini runs here answered nothing at all after hitting a quota
    // wall and still landed at 0.2%, which would publish as a score.
    //
    // The threshold was half, set when the failures seen were total: Gemini runs
    // coming back 100% empty after a quota wall. gpt-5.5 given skills and retrieval
    // together returned nothing for 55 of 158, which is a third of the suite, and
    // sailed through to publish 26.5% as though it were a score. A third of the
    // answers missing is not a score.
    //
    // 5% is free today and strict tomorrow: every healthy run on the board sits at
    // 0 to 0.6% empty and every dead one at 96% or more, so nothing currently
    // published changes, and the next partial degradation is caught at 8 of 158
    // rather than 80.
    const empty = results.filter((r) => (r.response_excerpt ?? "").trim().length < 40).length;
    const EMPTY_LIMIT = 0.05;
    if (empty > results.length * EMPTY_LIMIT) {
      incomplete.push({
        model: (d.metadata?.model ?? file).replace(/^.*\//, ""),
        pass, total, of: results.length,
        reason: `${empty} of ${results.length} answers were empty (${Math.round((100 * empty) / results.length)}%)`,
      });
      continue;
    }

    if (pass === 0 || total < results.length * 0.9) {
      incomplete.push({ model: (d.metadata?.model ?? file).replace(/^.*\//, ""), pass, total, of: results.length });
      continue;
    }

    const model = (d.metadata?.model ?? file).replace(/^.*\//, "");
    // What the run actually had in context. This was hardcoded to "+sui-skills"
    // because the pipeline could not produce anything else, which made the gap
    // between a model alone and the same model with the skills -- the thing this
    // suite exists to measure -- impossible to show. Older results carry no such
    // field and were all with-skills runs, so that is the default.
    const skills = d.metadata?.skills ?? "sui-skills";
    const withSkills = skills !== "none";
    // Which context the model had. Four of these exist; results written before
    // the layers did were all with-skills runs, which is the default.
    const layer = d.metadata?.layer ?? (withSkills ? "with-skills" : "baseline");
    // The MCP layers are measured but not published.
    //
    // The question they existed to answer is answered: across four models the
    // server moved the score by -0.1 to -3.1 points alone and +0.0 to +1.8 on
    // top of the skills, every one of the latter inside the noise floor, with
    // retrieval returning content on all 474 attempts. Two extra rows per card
    // for a null is two extra rows a reader has to decide to ignore.
    //
    // The cards stay in suievals/results and the finding is written down.
    // This only decides what the page shows.
    if (layer === "mcp-only" || layer === "with-skills-mcp") continue;
    const LAYER_NAME = {
      "baseline": "",
      "with-skills": " + sui-skills",
      "with-skills-mcp": " + sui-skills + MCP server",
      "mcp-only": " + MCP server",
    };
    runs.push({
      name: `${model}${LAYER_NAME[layer] ?? (withSkills ? " + sui-skills" : "")}`,
      layer,
      // Retrieval that came back empty on every question makes an MCP layer a
      // duplicate of its non-MCP sibling, and the board should say so rather than
      // publish two identical cards under different names.
      mcp: d.metadata?.mcp ?? null,
      model,
      harness: d.metadata?.runner ?? "pi-evals",
      skill: skills,
      withSkills,
      // The grading regime includes whether the model could open a file.
      //
      // A run with tools and a run without are not the same measurement: on one
      // skill the difference was 26.8% against 87.5%. Ranking them in one column
      // would compare harnesses while appearing to compare models, which is the
      // same error as mixing two graders, and the page already knows how to hold a
      // different regime back by name.
      scoring: (() => {
        // Read the regime off the counts, not off the label.
        //
        // The runner used to call a run "static" unless the judge decided every
        // single eval, so one timeout in 158 renamed the ruler. claude-fable-5's
        // baseline was judged on 157 evals, fell back on one, shipped as "static",
        // and the page then held it back from the only comparison it was run for.
        // The runner no longer does that, but the files already written still say
        // it, so derive the regime here where the counts are available and let the
        // label be the fallback.
        const decided = d.metadata?.judge_decided_evals;
        const fellBack = d.metadata?.static_fallback_evals;
        let grader = d.metadata?.scoring ?? "unknown";
        if (typeof decided === "number" && typeof fellBack === "number" && decided + fellBack > 0) {
          grader = decided / (decided + fellBack) >= 0.95 ? "judge" : "static";
        }
        const tools = d.metadata?.tools;
        // Runs predating the flag recorded nothing, and all of them were tool-free.
        return Array.isArray(tools) && tools.length ? grader : `${grader}, no tools`;
      })(),
      tools: d.metadata?.tools ?? [],
      toolCalls: d.metadata?.tool_calls ?? 0,
      // Carried even when under the limit: one or two empty answers is worth
      // seeing on the card rather than discovering in an artifact later.
      emptyAnswers: empty,
      // How many times each question was asked, and how far this run's score moved
      // across identical attempts. Without it the page has to guess at its own
      // resolution, and it was guessing with a hardcoded 2 points.
      sampling: d.aggregate?.sampling
        ? {
            k: d.aggregate.sampling.k,
            // The denominator for everything else here. Without it the page has
            // only the expectation count to divide by, which is 896 where these
            // are out of 158, and "same answer every time" renders as 98% where
            // it is 89%.
            evals: d.aggregate.sampling.evals ?? null,
            noiseFloor: d.aggregate.sampling.noiseFloor?.sd ?? null,
            passAtK: d.aggregate.sampling.passAtK ?? null,
            passPowK: d.aggregate.sampling.passPowK ?? null,
            flaky: d.aggregate.sampling.flaky ?? null,
          }
        : null,
      interval: d.aggregate?.interval ?? null,
      judge: d.metadata?.judge_model ?? null,
      recordedAt: d.metadata?.timestamp ?? null,
      pillars,
      total: { pass, total },
      missed,
    });
  }
  runs.sort((a, b) => b.total.pass / b.total.total - a.total.pass / a.total.total);
  return runs;
}

/**
 * Cards submitted by pull request, from suievals/results/ in the skills repo.
 *
 * The page tells people to run the suite on their own model and open a pull
 * request with the card. Until now nothing read those files, so a merged card
 * changed nothing and the instruction was decoration. These are the same shape as
 * a CI run once mapped, with two differences that have to survive the mapping:
 *
 *   - `scoring` carries the card's `graded_by`, so a self-graded card lands in a
 *     different grading regime from the judge-graded runs and the page holds it
 *     back from the ranking rather than listing a model that marked its own paper
 *     beside one that did not.
 *   - A card marked partial is reported as incomplete, for the same reason a
 *     partial CI run is: it is a different measurement, not a lower score.
 *
 * Anything malformed is skipped with a line on stderr rather than failing the
 * build, because a bad card in the skills repo should not take the board down.
 * suievals/validate.js in that repo is what stops one being merged.
 */
/**
 * Which grading regime a submitted card belongs to.
 *
 * "judge:claude-haiku-4-5-20251001" is the same measurement as a CI run graded by
 * claude-haiku-4-5-20251001, and treating the two strings as different regimes
 * would hold every graded submission off the board for a difference that does not
 * exist.
 */
function regimeOf(gradedBy, ciJudge) {
  if (!gradedBy) return "unknown";
  const m = /^judge:(.+)$/.exec(gradedBy);
  if (!m) return gradedBy;                       // "self", "human"
  return ciJudge && m[1] === ciJudge ? "judge" : gradedBy;
}

function readCards(byId, incomplete, ciJudge) {
  const dir = join(SKILLS_DIR, "suievals", "results");
  if (!existsSync(dir)) return [];
  const runs = [];

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    let card;
    try { card = JSON.parse(readFileSync(join(dir, file), "utf8")); }
    catch (err) { console.error(`  skipped card ${file}: ${err.message}`); continue; }
    if (card.suievals_card !== 1 || !Array.isArray(card.evals) || !card.model) {
      console.error(`  skipped card ${file}: not a card`);
      continue;
    }

    const pillars = Object.fromEntries(PILLAR_IDS.map((p) => [p, { pass: 0, total: 0 }]));
    const missed = [];
    let pass = 0, total = 0;

    for (const r of card.evals) {
      const e = byId.get(r.id);
      if (!e) continue;                       // an eval that left the suite
      const pid = PILLAR_OF[e.skill];
      if (!pid || !pillars[pid]) continue;
      if (!Number.isInteger(r.pass) || !Number.isInteger(r.of) || r.of <= 0) continue;
      pillars[pid].pass += r.pass; pillars[pid].total += r.of;
      pass += r.pass; total += r.of;
      if (r.pass < r.of) missed.push({ id: r.id, pillar: pid, skill: e.skill, passed: r.pass, of: r.of });
    }

    // `source: "ci"` marks a card the measuring pipeline published. Those are the
    // same measurement as a report-derived run, just travelling as public data,
    // so labelling them "(submitted)" would file the board's own numbers under
    // somebody else's contribution once the reports stop being available here.
    // The same layer filter the reports path applies. Without it an MCP card
    // reaches the board through the cards door, and the page shows two rows per
    // model again for a configuration that was retired for doing nothing.
    if (card.layer === "mcp-only" || card.layer === "with-skills-mcp") continue;

    // A card has to cover the suite to be scored against it, the same way a run
    // from the reports does. Without this a card answering 8 of 158 questions
    // ranked on the board at whatever it scored on those eight.
    const COVERAGE = 0.9;
    const suiteExpectations = [...byId.values()]
      .reduce((n, e) => n + (typeof e.expectations === "number" ? e.expectations : 0), 0);
    const covered = suiteExpectations ? total / suiteExpectations : 0;

    const submitted = sourceOf(card) === "community";
    // The handle is part of the name for a community card, and that is what keeps
    // two cards apart. The slug is built from this name, and before provenance was
    // in it a contributor re-running a model the pipeline had already measured
    // produced a second row with an identical name whose record page overwrote
    // the first. Two measurements, one file, no way to tell which survived.
    const label = `${card.model}${card.skills === "none" ? "" : " +sui-skills"}`
      + (submitted ? ` (submitted by ${card.submitted_by})` : "");
    // Coverage decides whether a card ranks. `partial` does not.
    //
    // Both used to, and the two together excluded almost everything. `partial`
    // is set by the emitter whenever a run misses even one eval, and a run
    // always misses one: an eval whose every sample came back empty has no
    // grades, so it is not in the card. The frontier models sit at 151 of 156
    // after their pre-#106 ids are recovered -- 97%, well past this threshold --
    // and were being marked rather than ranked because of the flag rather than
    // the number.
    //
    // So `partial` is now what it says it is, a statement that the run did not
    // cover the whole suite, and COVERAGE is the line. A card under it is still
    // refused, because a score over a third of the questions is not a score.
    if (!total || covered < COVERAGE) {
      incomplete.push({ model: card.model, pass, total, of: card.evals.length,
        // The number as well as the sentence: a reader deciding whether to
        // trust a marked run wants to know whether it answered half the suite
        // or a tenth of it.
        coverage: Math.round(100 * covered),
        skills: card.skills,
        reason: !total ? "no eval in the card is in the suite"
          : `covers ${Math.round(100 * covered)}% of the suite, under the ${Math.round(100 * COVERAGE)}% a ranked card needs` });
      continue;
    }

    runs.push({
      name: label,
      model: card.model,
      // What the run actually answered, so a reader can weigh a 97% card
      // against a 100% one rather than taking both as equivalent.
      coverage: Math.round(100 * covered),
      partial: Boolean(card.partial),
      recoveredIds: card.recovered_ids ?? 0,
      harness: card.harness ?? "self-report",
      skill: card.skills ?? "sui-skills",
      withSkills: card.skills !== "none",
      // The regime, not a constant. A self-graded card is not comparable with a
      // judge-graded one, and the page separates runs on exactly this field.
      //
      // A card graded by the same judge the CI runs use is in the same regime as
      // those runs, so it ranks beside them -- that is the whole point of the
      // submit-answers path. A card graded by a different judge keeps that judge
      // in its regime string and is held back by name, because two graders produce
      // two numbers and ranking them together compares the graders.
      scoring: regimeOf(card.graded_by, ciJudge),
      judge: null,
      submitted,
      source: sourceOf(card),
      submittedBy: card.submitted_by ?? null,
      staleManifest: card.manifest !== manifest,
      recordedAt: card.recorded_at ?? null,
      pillars,
      total: { pass, total },
      missed,
    });
  }
  return runs;
}

// ── Write ────────────────────────────────────────────────────────────

const { evals, unmapped, skillsSeen } = readCatalogue();
const byId = new Map(evals.map((e) => [e.id, e]));

const counts = Object.fromEntries(PILLAR_IDS.map((p) => [p, 0]));
for (const e of evals) if (counts[e.pillar] !== undefined) counts[e.pillar] += 1;

// The manifest changes whenever the suite does, so a card recorded against an
// older set can be marked instead of silently compared.
const manifest = createHash("sha256")
  .update(evals.map((e) => `${e.id}:${e.expectations}`).sort().join("\n"))
  .digest("hex")
  .slice(0, 12);

const kindCounts = Object.fromEntries(Object.keys(KINDS).map((k) => [k, 0]));
for (const e of evals) if (kindCounts[e.kind] !== undefined) kindCounts[e.kind] += 1;

const catalogue = {
  generated: new Date().toISOString(),
  manifest,
  pillars: PILLARS.map((p) => ({ id: p.id, name: p.name, desc: p.desc, count: counts[p.id] })),
  kinds: Object.entries(KINDS).map(([id, k]) => ({ id, ...k, count: kindCounts[id] })),
  evals,
};

const incomplete = [];
const ciRuns = readRuns(byId, incomplete);
// The judge the published runs were graded by, so a submission graded by the same
// one is recognised as the same measurement rather than held back.
const ciJudge = ciRuns.find((r) => r.judge)?.judge ?? null;
const runs = [...ciRuns, ...readCards(byId, incomplete, ciJudge)];
// Hold the numbers back without taking the page down.
//
// Everything measured is being re-run with sampling, and the published figures came
// from single attempts. Rather than show numbers that are about to change, or an
// empty page that reads as broken, the board can be put on hold: the suite, the
// skills and the method stay, and every measurement renders as a dash with a line
// saying why.
//
// The next build without the flag restores them, so this cannot be forgotten in
// place: it lasts exactly as long as the next run takes.
// A flag passed once does not survive the next build, and the next build is a CI
// job that nobody is watching. Holding the board has to outlast that, so it is a
// committed marker file: CI rebuilds the board on every run and will keep the hold
// until somebody deletes the file on purpose.
const HOLD_FILE = join(OUT_DIR, "HOLD");
const HOLD =
  process.argv.includes("--hold") ||
  process.env.SUIEVALS_HOLD === "1" ||
  existsSync(HOLD_FILE);
const results = {
  generated: new Date().toISOString(),
  manifest,
  hold: HOLD || undefined,
  // The runs are still written when held, because the page needs to know how many
  // there were and which models, and because dropping them would lose the data
  // rather than hide it.
  runs,
  incomplete,
};

mkdirSync(join(OUT_DIR, "evals"), { recursive: true });
mkdirSync(join(OUT_DIR, "results"), { recursive: true });
writeFileSync(join(OUT_DIR, "evals", "index.json"), JSON.stringify(catalogue, null, 1) + "\n");
writeFileSync(join(OUT_DIR, "results", "index.json"), JSON.stringify(results, null, 1) + "\n");

// One file per run, so a card can link to the record behind it.
//
// The board is a summary and summaries are where numbers go to stop being
// checkable. The per-model results live in an internal repo, so the public page
// could not point at anything; these are the same rows the board was built from,
// written next to it and served from the same place.
mkdirSync(join(OUT_DIR, "runs"), { recursive: true });
const slug = (r) => r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/**
 * The record as a page, because the link said "every question and the grader's
 * verdict" and opened a JSON file.
 *
 * Somebody following that link wants to read what the model got wrong, and
 * handing them a serialised object asks them to parse it in their head. The
 * JSON is still written beside this, for anything reading it by machine.
 */
function recordPage(r, missed, manifest, generated) {
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  const rows = missed.map((m) => `    <tr>
      <td class="q">${esc(m.prompt ?? m.id)}<span class="meta">${esc(m.skill)}${m.kind ? ` &middot; ${esc(m.kind)}` : ""}</span>
        ${(m.sources ?? []).map((u) => `<a href="${esc(u)}">${esc(String(u).replace(/^https?:\/\//, ""))}</a>`).join(" ")}</td>
      <td class="s">${m.passed} of ${m.of}</td>
    </tr>`).join("\n");
  const pillars = Object.entries(r.pillars ?? {})
    .filter(([, v]) => v && v.total)
    .map(([k, v]) => `<li><b>${pct(v.pass, v.total)}%</b> ${esc(k)} <span>${v.pass} of ${v.total}</span></li>`)
    .join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(r.name)} &middot; Sui Evals</title>
<style>
  :root { --bg:#05080f; --card:#0b1220; --line:#18243a; --ink:#e8eef8; --ink-2:#9fb0c9; --ink-3:#6b7f9c; --sui:#4da2ff; }
  @media (prefers-color-scheme: light) { :root { --bg:#fff; --card:#f7f9fc; --line:#e3e9f2; --ink:#0b1220; --ink-2:#44536a; --ink-3:#6b7f9c; } }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .wrap { max-width:900px; margin:0 auto; padding:40px 20px 72px; }
  a { color:var(--sui); }
  h1 { font-size:26px; margin:0 0 6px; letter-spacing:-0.02em; }
  .note { color:var(--ink-3); font-size:13px; margin:0 0 26px; }
  ul.p { list-style:none; display:flex; flex-wrap:wrap; gap:10px; padding:0; margin:0 0 30px; }
  ul.p li { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:10px 14px; font-size:13px; color:var(--ink-2); }
  ul.p b { color:var(--ink); font-size:17px; margin-right:6px; }
  ul.p span { color:var(--ink-3); }
  h2 { font-size:13px; text-transform:uppercase; letter-spacing:.12em; color:var(--ink-3); margin:0 0 10px; }
  table { width:100%; border-collapse:collapse; }
  td { border-top:1px solid var(--line); padding:12px 0; vertical-align:top; }
  td.q { padding-right:20px; }
  td.s { text-align:right; white-space:nowrap; color:var(--ink-2); font-variant-numeric:tabular-nums; }
  .meta { display:block; color:var(--ink-3); font-size:12px; margin-top:3px; }
  td.q a { font-size:12px; margin-right:10px; }
</style></head><body><div class="wrap">
  <h1>${esc(r.name)}</h1>
  <p class="note">
    ${esc(r.total.pass)} of ${esc(r.total.total)} expectations met${r.recordedAt ? `, recorded ${esc(String(r.recordedAt).slice(0, 10))}` : ""}.
    Graded by ${esc(r.scoring ?? "judge")}${r.sampling?.k > 1 ? `, each question asked ${r.sampling.k} times` : ", each question asked once"}.
    Eval set ${esc(manifest)}. <a href="../index.html">Back to the board</a> &middot;
    <a href="${esc(slug(r))}.json">the same thing as JSON</a>
  </p>
  <ul class="p">${pillars}</ul>
  <h2>${missed.length} question${missed.length === 1 ? "" : "s"} it did not answer in full</h2>
  <table><tbody>
${rows}
  </tbody></table>
</div></body></html>
`;
}

for (const r of runs) {
  r.record = `runs/${slug(r)}.html`;
  const missedFull = r.missed.map((m) => {
    const e = byId.get(m.id);
    return { ...m, kind: e?.kind ?? null, prompt: e?.summary ?? null, sources: e?.sources ?? [] };
  });
  writeFileSync(join(OUT_DIR, "runs", `${slug(r)}.html`),
    recordPage(r, missedFull, manifest, results.generated));
  writeFileSync(
    join(OUT_DIR, "runs", `${slug(r)}.json`),
    JSON.stringify({
      generated: results.generated,
      manifest,
      run: { ...r, record: undefined },
      // The questions this run did not answer in full, with their text, so the
      // file stands on its own rather than needing the catalogue beside it.
      missed: missedFull,
    }, null, 1) + "\n",
  );
}
// Rewritten so the index carries the link it just generated.
writeFileSync(join(OUT_DIR, "results", "index.json"), JSON.stringify(results, null, 1) + "\n");

console.log(`suite ${manifest}: ${evals.length} evals from ${skillsSeen.length} skills`);
for (const p of catalogue.pillars) console.log(`   ${p.id.padEnd(13)} ${String(p.count).padStart(3)}`);
if (unmapped.length) {
  console.log(`\n${unmapped.length} skill(s) have evals but no pillar, so their evals are excluded:`);
  for (const s of unmapped) console.log(`   ${s}`);
  console.log("Add them to suievals/pillars.js.");
}
const submitted = runs.filter((r) => r.submitted).length;
console.log(`\n${runs.length} run(s) recorded${submitted ? ` (${submitted} submitted by pull request)` : ""}:`);
for (const r of runs) {
  const pct = Math.round((100 * r.total.pass) / r.total.total);
  console.log(`   ${r.name.padEnd(34)} ${String(r.total.pass).padStart(3)}/${r.total.total}  ${String(pct).padStart(3)}%`);
}
if (incomplete.length) {
  console.log(`\n${incomplete.length} run(s) excluded as incomplete:`);
  for (const r of incomplete) console.log(`   ${r.model.padEnd(34)} ${r.pass}/${r.total} of ${r.of} evals`);
}
console.log(`\nwritten to ${OUT_DIR}`);
