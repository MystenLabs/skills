#!/usr/bin/env node

/**
 * Skill Eval Runner
 *
 * Discovers evals from each skill's evals/evals.json, sends the prompt
 * to Claude with the skill's reference files as context, then uses an
 * LLM-as-judge call to grade the response against the eval's expectations.
 *
 * Usage:
 *   node scripts/run-evals.js                  # run all evals
 *   node scripts/run-evals.js --changed-only   # run evals for skills changed in this PR
 *   node scripts/run-evals.js --skill sui-move  # run evals for a single skill
 *   node scripts/run-evals.js --judge-model claude-haiku-4-5-20251001  # use a cheaper judge
 *   node scripts/run-evals.js --concurrency 5  # run 5 skills in parallel (default: 3)
 *   node scripts/run-evals.js --timeout 60000  # per-eval timeout in ms (default: 120000)
 *
 * Environment:
 *   ANTHROPIC_API_KEY   required
 *   EVAL_MODEL          model for generating responses  (default: claude-opus-4-6)
 *   JUDGE_MODEL         model for grading responses     (default: claude-haiku-4-5-20251001)
 */

import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { createHash } from "crypto";
import { resolve, dirname, basename, join } from "path";
import {
  ROOT,
  getFlag,
  hasFlag,
  Semaphore,
  withTimeout,
  discoverEvalFiles,
  loadSkillContext,
  parseEvals,
} from "./lib/utils.js";
import { compareToBaseline } from "./lib/gate.js";

// ── CLI args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const skillFlag = getFlag(args, "skill");
const judgeModelFlag = getFlag(args, "judge-model");
const concurrencyFlag = getFlag(args, "concurrency");
const timeoutFlag = getFlag(args, "timeout");
const changedOnly = hasFlag(args, "changed-only");
const repeatFlag = getFlag(args, "repeat");
const baselineFlag = getFlag(args, "baseline");
const noCache = hasFlag(args, "no-cache");
const refreshCache = hasFlag(args, "refresh");
//: Fail on any unmet expectation, the way this gate used to. Kept for the
//: scheduled run, which is measuring the absolute state rather than guarding a
//: change.
const strict = hasFlag(args, "strict");

const EVAL_MODEL = process.env.EVAL_MODEL ?? "claude-opus-4-6";
const JUDGE_MODEL = judgeModelFlag ?? process.env.JUDGE_MODEL ?? "claude-haiku-4-5-20251001";
const MAX_TOKENS_RESPONSE = 4096;
const MAX_TOKENS_JUDGE = 2048;
const CONCURRENCY = parseInt(concurrencyFlag ?? "3", 10);
const EVAL_TIMEOUT = parseInt(timeoutFlag ?? "120000", 10);
const REPEAT = Math.max(1, parseInt(repeatFlag ?? "1", 10));
const CACHE_DIR = join(ROOT, "scripts", ".eval-cache");

/**
 * Why there is a cache at all.
 *
 * Nothing about an LLM gate is reproducible: temperature 0 is not a guarantee
 * from any provider, and the thing under test is free-form prose, so which facts
 * an answer happens to include moves between runs. Three consecutive runs of the
 * same commit here failed on three different sets of expectations.
 *
 * Grading, though, is reproducible the moment the response is fixed. Keyed on the
 * model, the skill text and the prompt, a cached response means a re-run re-grades
 * the same answers instead of new ones -- which separates "the skill changed the
 * answer" from "the judge changed its mind", the distinction this gate could not
 * make before. A skill edit changes the key by itself, so a PR regenerates exactly
 * the evals it touches and nothing else.
 */
function cacheKey(parts) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32);
}

function readCache(key) {
  if (noCache || refreshCache) return null;
  try {
    return JSON.parse(readFileSync(join(CACHE_DIR, `${key}.json`), "utf-8")).value;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  if (noCache) return;
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify({ value, at: new Date().toISOString() }));
  } catch {
    // A cache that cannot be written must not fail the run.
  }
}

const client = new Anthropic();

// ── Generate a response using the skill context ──────────────────────
async function generateResponse(skillContext, prompt, sample = 0) {
  const system = `You are an expert Sui blockchain developer assistant. Use the following skill reference to answer the user's question.\n\n${skillContext}`;
  // The sample index is part of the key on purpose: without it every repeat would
  // read back the first answer and --repeat would measure nothing.
  const key = cacheKey(["response", EVAL_MODEL, MAX_TOKENS_RESPONSE, system, prompt, sample]);
  const hit = readCache(key);
  if (hit !== null) return hit;

  const response = await client.messages.create({
    model: EVAL_MODEL,
    max_tokens: MAX_TOKENS_RESPONSE,
    // Nothing was pinning this, so the answer under test and the grade of it were
    // both sampled freely. Not a guarantee of reproducibility -- no provider offers
    // one -- but the largest avoidable source of movement between runs.
    temperature: 0,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  writeCache(key, text);
  return text;
}

// ── Judge the response against expectations ──────────────────────────
async function judgeResponse(prompt, response, expectations, expectedOutput) {
  const judgePrompt = `You are a strict eval grader for Sui blockchain developer documentation skills.

Given a user prompt, a model response, an expected output description, and a list of specific expectations, determine whether the response satisfies each expectation.

Be strict: the expectation must be clearly and explicitly satisfied in the response, not merely implied or partially addressed.

<user_prompt>
${prompt}
</user_prompt>

<model_response>
${response}
</model_response>

<expected_output>
${expectedOutput}
</expected_output>

<expectations>
${expectations.map((e, i) => `${i + 1}. ${e}`).join("\n")}
</expectations>

Return ONLY valid JSON — an array where each entry has:
  { "index": <1-based>, "expectation": "<the expectation text>", "pass": true/false, "reason": "<brief explanation>" }

Do not include any text outside the JSON array.`;

  const judgeKey = cacheKey(["judge", JUDGE_MODEL, prompt, response, expectations, expectedOutput]);
  const judgeHit = readCache(judgeKey);
  if (judgeHit !== null) return judgeHit;

  const result = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: MAX_TOKENS_JUDGE,
    // A grader that answers differently on the same response is adding its own
    // variance to a measurement that already has the model's.
    temperature: 0,
    messages: [{ role: "user", content: judgePrompt }],
  });

  const text = result.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  // Extract JSON from the response (handle markdown code fences)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`Judge did not return valid JSON:\n${text}`);
  }
  const grades = JSON.parse(jsonMatch[0]);
  writeCache(judgeKey, grades);
  return grades;
}

// ── Global semaphore — limits total in-flight eval work ──────────────
const evalSemaphore = new Semaphore(CONCURRENCY);

// ── Run all evals for a single skill ─────────────────────────────────
async function runSkillEvals(evalFile) {
  const skillDir = basename(resolve(dirname(evalFile), ".."));
  const evals = parseEvals(evalFile);
  const skillContext = loadSkillContext(evalFile);

  const results = await Promise.all(
    evals.map(async (ev, i) => {
      const evalId = ev.id ?? `${skillDir}-${i + 1}`;

      await evalSemaphore.acquire();
      try {
        // One sample cannot separate a real failure from the model wording its
        // answer differently. Each expectation is graded across REPEAT samples and
        // carries how many of them it passed, so a gate can tell a standing failure
        // from a flicker.
        const work = async () => {
          const samples = [];
          for (let i = 0; i < REPEAT; i++) {
            const response = await generateResponse(skillContext, ev.prompt, i);
            const grades = await judgeResponse(
              ev.prompt,
              response,
              ev.expectations,
              ev.expected_output ?? ""
            );
            samples.push({ response, grades });
          }
          return samples;
        };

        const samples = await withTimeout(work(), EVAL_TIMEOUT * REPEAT, evalId);

        // Graded by position against the expectations we sent, because the judge
        // echoes the text and can reword it.
        const grades = ev.expectations.map((expectation, i) => {
          const passes = samples.filter((s) => s.grades[i]?.pass === true).length;
          const firstFail = samples.find((s) => s.grades[i]?.pass !== true);
          return {
            expectation,
            // Majority across samples, so `pass` keeps meaning "this expectation is
            // met" for everything downstream that reads it.
            pass: passes * 2 > REPEAT,
            passes,
            samples: REPEAT,
            reason: firstFail?.grades[i]?.reason ?? samples[0]?.grades[i]?.reason ?? "",
          };
        });

        const passed = grades.filter((g) => g.pass).length;
        const failed = grades.filter((g) => !g.pass).length;

        const status = failed === 0 ? "PASS" : "FAIL";

        return {
          result: {
            skill: skillDir,
            eval_id: evalId,
            status,
            passed,
            total: grades.length,
            grades,
            response_excerpt: samples[0].response.slice(0, 200),
          },
          passed,
          failed,
        };
      } catch (err) {
        return {
          result: {
            skill: skillDir,
            eval_id: evalId,
            status: "ERROR",
            error: err.message.slice(0, 200),
          },
          passed: 0,
          failed: 1,
        };
      } finally {
        evalSemaphore.release();
      }
    })
  );

  // Print results for this skill sequentially for readable output
  console.log(`\n━━ ${skillDir} (${evals.length} evals) ━━`);
  for (const { result } of results) {
    if (result.status === "ERROR") {
      console.log(`  ${result.eval_id} ... ERROR: ${result.error}`);
    } else {
      console.log(
        `  ${result.eval_id} ... ${result.status} (${result.passed}/${result.total} expectations)`
      );
      if (result.status === "FAIL") {
        for (const g of result.grades.filter((g) => !g.pass)) {
          console.log(`    ✗ ${g.expectation}`);
          console.log(`      → ${g.reason}`);
        }
      }
    }
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  const evalFiles = discoverEvalFiles("evals.json", {
    skillFilter: skillFlag,
    changedOnly,
  });
  if (evalFiles.length === 0) {
    console.log("No eval files to run.");
    process.exit(0);
  }

  console.log(`\nEval runner configuration:`);
  console.log(`  Response model : ${EVAL_MODEL}`);
  console.log(`  Judge model    : ${JUDGE_MODEL}`);
  console.log(`  Concurrency    : ${CONCURRENCY} evals in parallel`);
  console.log(`  Eval timeout   : ${EVAL_TIMEOUT}ms`);
  console.log(`  Eval files     : ${evalFiles.length}\n`);

  // Launch all skills — the global evalSemaphore limits total in-flight evals
  const allSkillResults = await Promise.all(evalFiles.map(runSkillEvals));

  const allResults = [];
  let totalPass = 0;
  let totalFail = 0;
  let totalEvals = 0;

  for (const skillResults of allSkillResults) {
    for (const { result, passed, failed } of skillResults) {
      allResults.push(result);
      totalPass += passed;
      totalFail += failed;
      totalEvals++;
    }
  }

  // ── Summary ──────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log(`RESULTS: ${totalEvals} evals, ${totalPass} expectations passed, ${totalFail} failed`);
  console.log(`${"═".repeat(60)}\n`);

  // ── Write results JSON ──────────────────────────────────────────
  const outPath = join(ROOT, "scripts", "eval-results.json");
  writeFileSync(outPath, JSON.stringify(allResults, null, 2));
  console.log(`Full results written to ${outPath}`);

  // ── GitHub Actions summary ──────────────────────────────────────
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      "## Skill Eval Results\n",
      `| Skill | Eval | Status | Passed | Total |`,
      `|-------|------|--------|--------|-------|`,
      ...allResults.map(
        (r) =>
          `| ${r.skill} | ${r.eval_id} | ${r.status === "PASS" ? "✅" : "❌"} ${r.status} | ${r.passed ?? "-"} | ${r.total ?? "-"} |`
      ),
      "",
      `**Total: ${totalPass} passed, ${totalFail} failed across ${totalEvals} evals**`,
    ].join("\n");

    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: "a" });
  }

  // ── The gate ─────────────────────────────────────────────────────
  //
  // This used to be `totalFail > 0`: every expectation across every changed skill
  // had to be met, judged strictly, from one sample. Three consecutive runs of the
  // same commit failed on three different sets of expectations, so the gate could
  // not be passed except by luck and said nothing about the change under review.
  //
  // What a gate on a pull request should answer is whether the change made things
  // worse. So the comparison is against the recorded baseline, and only a
  // regression with no sample supporting it counts: an expectation the baseline met
  // and that now fails every one of REPEAT samples. An expectation that passed 2 of
  // 3 and now passes 1 of 3 is inside the noise and is reported, not failed.
  const baselinePath = baselineFlag;
  const haveBaseline = baselinePath && existsSync(baselinePath);
  let confirmedRegressions = [];
  let confirmedFixes = [];
  let unsupported = [];

  let compared = 0;
  if (haveBaseline) {
    const baseline = JSON.parse(readFileSync(baselinePath, "utf-8"));
    ({ confirmedRegressions, confirmedFixes, unsupported, compared } =
      compareToBaseline(baseline, allResults));
  }

  console.log(`Samples per eval: ${REPEAT}`);
  if (haveBaseline) {
    console.log(`Compared against baseline: ${baselinePath} (${compared} expectations matched)`);
    console.log(`  confirmed fixes:       ${confirmedFixes.length}`);
    console.log(`  confirmed regressions: ${confirmedRegressions.length}`);
    console.log(`  moved, but within sampling noise: ${unsupported.length}`);
    for (const r of confirmedRegressions) {
      console.log(`  REGRESSION ${r.skill}/${r.eval_id}: ${r.expectation}`);
      console.log(`      0 of ${r.samples} samples passed. ${String(r.reason).slice(0, 160)}`);
    }
    for (const r of unsupported) {
      console.log(`  noise ${r.skill}/${r.eval_id}: ${r.passes}/${r.samples} — ${r.expectation.slice(0, 70)}`);
    }
  } else {
    console.log(`No baseline supplied (--baseline), so nothing is gated on a change.`);
  }

  if (strict) {
    // Absolute state, for the scheduled run that records the baseline.
    process.exit(totalFail > 0 ? 1 : 0);
  }
  if (!haveBaseline) {
    console.log(`\nReporting only: pass --baseline <file> to gate on regressions, or --strict for the absolute gate.`);
    process.exit(0);
  }
  process.exit(confirmedRegressions.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
