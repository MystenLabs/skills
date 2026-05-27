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
import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve, dirname, basename, join } from "path";
import { execSync } from "child_process";
import { glob } from "glob";

// ── Load .env file if present (key=value, one per line) ──────────────
const ROOT_FOR_ENV = resolve(dirname(new URL(import.meta.url).pathname), "..");
const envPath = join(ROOT_FOR_ENV, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

// ── CLI args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const changedOnly = args.includes("--changed-only");
const skillFlag = args.find((a) => a.startsWith("--skill="))?.split("=")[1]
  ?? (args.includes("--skill") ? args[args.indexOf("--skill") + 1] : null);
const judgeModelFlag = args.find((a) => a.startsWith("--judge-model="))?.split("=")[1]
  ?? (args.includes("--judge-model") ? args[args.indexOf("--judge-model") + 1] : null);
const concurrencyFlag = args.find((a) => a.startsWith("--concurrency="))?.split("=")[1]
  ?? (args.includes("--concurrency") ? args[args.indexOf("--concurrency") + 1] : null);
const timeoutFlag = args.find((a) => a.startsWith("--timeout="))?.split("=")[1]
  ?? (args.includes("--timeout") ? args[args.indexOf("--timeout") + 1] : null);

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const EVAL_MODEL = process.env.EVAL_MODEL ?? "claude-opus-4-6";
const JUDGE_MODEL = judgeModelFlag ?? process.env.JUDGE_MODEL ?? "claude-haiku-4-5-20251001";
const MAX_TOKENS_RESPONSE = 4096;
const MAX_TOKENS_JUDGE = 2048;
const CONCURRENCY = parseInt(concurrencyFlag ?? "3", 10);
const EVAL_TIMEOUT = parseInt(timeoutFlag ?? "120000", 10);

const client = new Anthropic();

// ── Semaphore for concurrency control ────────────────────────────────
class Semaphore {
  constructor(max) {
    this._max = max;
    this._active = 0;
    this._queue = [];
  }
  async acquire() {
    if (this._active < this._max) {
      this._active++;
      return;
    }
    await new Promise((resolve) => this._queue.push(resolve));
  }
  release() {
    this._active--;
    if (this._queue.length > 0) {
      this._active++;
      this._queue.shift()();
    }
  }
}

// ── Timeout wrapper ──────────────────────────────────────────────────
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Eval timed out after ${ms}ms: ${label}`)), ms)
    ),
  ]);
}

// ── Discover evals ────────────────────────────────────────────────────
function discoverEvalFiles() {
  const pattern = join(ROOT, "**/evals/evals.json");
  let files = glob.sync(pattern, { ignore: ["**/node_modules/**", "**/template/**"] });

  if (skillFlag) {
    files = files.filter((f) => f.includes(`/${skillFlag}/`));
    if (files.length === 0) {
      console.error(`No evals found for skill: ${skillFlag}`);
      process.exit(1);
    }
  }

  if (changedOnly) {
    try {
      const diff = execSync("git diff --name-only origin/main...HEAD", {
        cwd: ROOT,
        encoding: "utf-8",
      });
      const changedSkills = new Set(
        diff
          .split("\n")
          .filter(Boolean)
          .map((f) => f.split("/")[0])
      );
      files = files.filter((f) => {
        const rel = f.replace(ROOT + "/", "");
        const skill = rel.split("/")[0];
        return changedSkills.has(skill);
      });
    } catch {
      console.warn("Could not determine changed files, running all evals");
    }
  }

  return files;
}

// ── Load skill context ────────────────────────────────────────────────
function loadSkillContext(evalFilePath) {
  const skillDir = resolve(dirname(evalFilePath), "..");
  const skillName = basename(skillDir);
  const mdFiles = glob.sync(join(skillDir, "*.md"), {
    ignore: ["**/node_modules/**"],
  });

  const parts = [];
  // Load SKILL.md first if it exists
  const skillMd = mdFiles.find((f) => basename(f) === "SKILL.md");
  if (skillMd) {
    parts.push(`# ${skillName} — SKILL.md\n\n${readFileSync(skillMd, "utf-8")}`);
  }
  // Then load supplemental .md files
  for (const f of mdFiles.sort()) {
    if (basename(f) === "SKILL.md") continue;
    parts.push(`# ${skillName} — ${basename(f)}\n\n${readFileSync(f, "utf-8")}`);
  }

  return parts.join("\n\n---\n\n");
}

// ── Parse evals (handles both object-wrapped and array formats) ──────
function parseEvals(filePath) {
  const raw = JSON.parse(readFileSync(filePath, "utf-8"));
  if (Array.isArray(raw)) return raw;
  if (raw.evals && Array.isArray(raw.evals)) return raw.evals;
  throw new Error(`Unexpected eval format in ${filePath}`);
}

// ── Generate a response using the skill context ──────────────────────
async function generateResponse(skillContext, prompt) {
  const response = await client.messages.create({
    model: EVAL_MODEL,
    max_tokens: MAX_TOKENS_RESPONSE,
    system: `You are an expert Sui blockchain developer assistant. Use the following skill reference to answer the user's question.\n\n${skillContext}`,
    messages: [{ role: "user", content: prompt }],
  });
  return response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
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

  const result = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: MAX_TOKENS_JUDGE,
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
  return JSON.parse(jsonMatch[0]);
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
        const work = async () => {
          const response = await generateResponse(skillContext, ev.prompt);
          const grades = await judgeResponse(
            ev.prompt,
            response,
            ev.expectations,
            ev.expected_output ?? ""
          );
          return { response, grades };
        };

        const { response, grades } = await withTimeout(work(), EVAL_TIMEOUT, evalId);

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
            response_excerpt: response.slice(0, 200),
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
  const evalFiles = discoverEvalFiles();
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

  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
