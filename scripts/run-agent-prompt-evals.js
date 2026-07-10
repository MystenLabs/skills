#!/usr/bin/env node

/**
 * AgentPrompt Eval Runner
 *
 * Evaluates every prompt shown in the <AgentPrompt> component on docs.sui.io.
 * These prompts are standalone (no skill context) -- they test whether a model
 * can produce a useful response to developer-facing prompts as written.
 *
 * Usage:
 *   node scripts/run-agent-prompt-evals.js
 *   node scripts/run-agent-prompt-evals.js --provider openai --model gpt-4o
 *   node scripts/run-agent-prompt-evals.js --provider anthropic --model claude-sonnet-4-6
 *   node scripts/run-agent-prompt-evals.js --id sui-install        # single prompt
 *   node scripts/run-agent-prompt-evals.js --runs 3                # flake detection
 *   node scripts/run-agent-prompt-evals.js --concurrency 5
 *
 * Environment:
 *   ANTHROPIC_API_KEY   required (for judge + anthropic provider)
 *   OPENAI_API_KEY      required if --provider openai
 *   EVAL_MODEL          model override
 *   JUDGE_MODEL         judge model override
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

import {
  ROOT,
  Semaphore,
  getFlag,
  hasFlag,
  loadMultiSkillContext,
  normalizeEval,
  runDeterministicChecks,
  withTimeout,
} from "./lib/utils.js";
import { createProvider } from "./lib/providers.js";

// ── CLI args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);

const providerName = getFlag(args, "provider") ?? "anthropic";
const modelFlag = getFlag(args, "model");
const judgeModelFlag = getFlag(args, "judge-model");
const concurrencyFlag = getFlag(args, "concurrency");
const timeoutFlag = getFlag(args, "timeout");
const runsFlag = getFlag(args, "runs");
const idFilter = getFlag(args, "id");
const withSkills = hasFlag(args, "with-skills");

const EVAL_MODEL =
  modelFlag ?? process.env.EVAL_MODEL ?? "claude-sonnet-4-6";
const JUDGE_MODEL =
  judgeModelFlag ?? process.env.JUDGE_MODEL ?? "claude-haiku-4-5-20251001";
const CONCURRENCY = parseInt(concurrencyFlag ?? "3", 10);
const EVAL_TIMEOUT = parseInt(timeoutFlag ?? "120000", 10);
const NUM_RUNS = parseInt(runsFlag ?? "1", 10);

const provider = createProvider(providerName);
const judgeClient = new Anthropic();

// ── Skill map (--with-skills mode) ──────────────────────────────────
let skillMap = {};
if (withSkills) {
  const mapPath = join(ROOT, "evals", "agent-prompts", "prompt-skill-map.json");
  skillMap = JSON.parse(readFileSync(mapPath, "utf-8"));
}

// ── System prompt for AgentPrompt evals ──────────────────────────────
// These prompts appear on docs.sui.io and are designed for AI agents
// helping developers. The system prompt sets the Sui developer context.
const SYSTEM_PROMPT = `You are an expert Sui blockchain developer assistant. You help developers build on Sui by providing clear, accurate, and actionable guidance. You are familiar with the Sui CLI, Move programming language, Sui SDK, PTBs, GraphQL/gRPC APIs, Walrus storage, and the full Sui development stack.

When the user gives you a task, provide step-by-step instructions, working code examples, and concrete commands. Be specific to Sui -- do not give generic blockchain advice.`;

// ── Load prompts ─────────────────────────────────────────────────────
function loadPrompts() {
  const promptsPath = join(ROOT, "evals", "agent-prompts", "prompts.json");
  let prompts = JSON.parse(readFileSync(promptsPath, "utf-8"));

  if (idFilter) {
    prompts = prompts.filter((p) => p.id === idFilter);
    if (prompts.length === 0) {
      console.error(`No prompt found with id: ${idFilter}`);
      process.exit(1);
    }
  }

  return prompts;
}

// ── Generate response ────────────────────────────────────────────────
async function generateResponse(prompt, skillContext) {
  let systemPrompt = SYSTEM_PROMPT;
  if (skillContext) {
    systemPrompt = `You are an expert Sui blockchain developer assistant. Use the following skill references to answer the user's question.\n\n${skillContext}`;
  }
  return provider.generate(systemPrompt, prompt, {
    model: EVAL_MODEL,
    maxTokens: 8192,
  });
}

// ── LLM judge ────────────────────────────────────────────────────────
async function judgeResponse(prompt, response, expectations) {
  if (!expectations || expectations.length === 0) return [];

  const judgePrompt = `You are a strict eval grader for Sui blockchain developer documentation.

The following prompt appears on docs.sui.io as a suggested prompt for AI agents helping Sui developers. Grade whether the model response adequately satisfies each expectation.

Be strict: the expectation must be clearly and explicitly satisfied, not merely implied.

<user_prompt>
${prompt}
</user_prompt>

<model_response>
${response}
</model_response>

<expectations>
${expectations.map((e, i) => `${i + 1}. ${e}`).join("\n")}
</expectations>

Return ONLY valid JSON -- an array where each entry has:
  { "index": <1-based>, "expectation": "<text>", "pass": true/false, "reason": "<brief explanation>" }`;

  const result = await judgeClient.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: judgePrompt }],
  });

  const text = result.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`Judge did not return valid JSON:\n${text}`);
  }
  return JSON.parse(jsonMatch[0]);
}

// ── Single eval run ──────────────────────────────────────────────────
async function runSingleEval(promptData) {
  const norm = normalizeEval(promptData);
  let skillContext = null;
  if (withSkills && skillMap[promptData.id]) {
    skillContext = loadMultiSkillContext(skillMap[promptData.id]);
  }
  const response = await generateResponse(norm.prompt, skillContext);

  const deterministicResults = runDeterministicChecks(
    response,
    norm.deterministic_checks
  );

  const subjectiveGrades = await judgeResponse(
    norm.prompt,
    response,
    norm.subjective_expectations
  );

  return { response, deterministicResults, subjectiveGrades };
}

// ── Majority vote ────────────────────────────────────────────────────
function majorityVote(runResults) {
  if (runResults.length === 1) {
    return {
      ...runResults[0],
      runCount: 1,
      flaky: false,
    };
  }

  const deterministicResults = runResults[0].deterministicResults;
  const numExpectations = runResults[0].subjectiveGrades?.length ?? 0;
  const subjectiveGrades = [];
  let anyFlaky = false;

  for (let i = 0; i < numExpectations; i++) {
    const votes = runResults.map((r) => r.subjectiveGrades[i]?.pass ?? false);
    const passCount = votes.filter(Boolean).length;
    const pass = passCount > runResults.length / 2;
    const isFlaky = passCount > 0 && passCount < runResults.length;
    if (isFlaky) anyFlaky = true;

    const representative =
      runResults.find((r) => r.subjectiveGrades[i]?.pass === pass)
        ?.subjectiveGrades[i] ?? runResults[0].subjectiveGrades[i];

    subjectiveGrades.push({
      ...representative,
      pass,
      pass_rate: `${passCount}/${runResults.length}`,
      flaky: isFlaky,
    });
  }

  return {
    response: runResults[0].response,
    deterministicResults,
    subjectiveGrades,
    runCount: runResults.length,
    flaky: anyFlaky,
  };
}

// ── Concurrency limiter ──────────────────────────────────────────────
const evalSemaphore = new Semaphore(CONCURRENCY);

// ── Run one prompt eval ──────────────────────────────────────────────
async function runPromptEval(promptData) {
  await evalSemaphore.acquire();
  try {
    const work = async () => {
      const runResults = [];
      for (let run = 0; run < NUM_RUNS; run++) {
        runResults.push(await runSingleEval(promptData));
      }
      return majorityVote(runResults);
    };

    const { response, deterministicResults, subjectiveGrades, runCount, flaky } =
      await withTimeout(work(), EVAL_TIMEOUT * NUM_RUNS, promptData.id);

    const detPassed = deterministicResults.filter((d) => d.pass).length;
    const detFailed = deterministicResults.filter((d) => !d.pass).length;
    const subjPassed = subjectiveGrades.filter((g) => g.pass).length;
    const subjFailed = subjectiveGrades.filter((g) => !g.pass).length;

    const totalPassed = detPassed + subjPassed;
    const totalFailed = detFailed + subjFailed;
    const total = totalPassed + totalFailed;

    return {
      id: promptData.id,
      source_page: promptData.source_page,
      mode: withSkills ? "with-skills" : "baseline",
      skills_loaded: withSkills ? (skillMap[promptData.id] ?? []) : [],
      status: totalFailed === 0 ? "PASS" : "FAIL",
      passed: totalPassed,
      total,
      deterministic_results: deterministicResults,
      subjective_grades: subjectiveGrades,
      run_count: runCount,
      flaky,
      response_excerpt: response.slice(0, 300),
    };
  } catch (err) {
    return {
      id: promptData.id,
      source_page: promptData.source_page,
      mode: withSkills ? "with-skills" : "baseline",
      skills_loaded: withSkills ? (skillMap[promptData.id] ?? []) : [],
      status: "ERROR",
      error: err.message.slice(0, 500),
    };
  } finally {
    evalSemaphore.release();
  }
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  const prompts = loadPrompts();

  console.log(`\nAgentPrompt Eval Runner`);
  console.log(`  Mode           : ${withSkills ? "with-skills" : "baseline (no skills)"}`);
  console.log(`  Provider       : ${providerName}`);
  console.log(`  Response model : ${EVAL_MODEL}`);
  console.log(`  Judge model    : ${JUDGE_MODEL}`);
  console.log(`  Concurrency    : ${CONCURRENCY}`);
  console.log(`  Runs/eval      : ${NUM_RUNS}`);
  console.log(`  Prompts        : ${prompts.length}\n`);

  const results = await Promise.all(prompts.map(runPromptEval));

  // Print results
  console.log(`\n${"━".repeat(60)}`);
  console.log(`AgentPrompt Results`);
  console.log(`${"━".repeat(60)}`);

  for (const result of results) {
    if (result.status === "ERROR") {
      console.log(`  ${result.id} ... ERROR: ${result.error}`);
      continue;
    }

    const flakyTag = result.flaky ? " [FLAKY]" : "";
    const runsTag = result.run_count > 1 ? ` (${result.run_count} runs)` : "";
    console.log(
      `  ${result.id} ... ${result.status} (${result.passed}/${result.total})${runsTag}${flakyTag}`
    );
    console.log(`    page: ${result.source_page}`);

    for (const d of (result.deterministic_results ?? []).filter((d) => !d.pass)) {
      console.log(`    [det] ✗ ${d.type}: ${d.detail}`);
    }
    for (const g of (result.subjective_grades ?? []).filter((g) => !g.pass)) {
      const rate = g.pass_rate ? ` (${g.pass_rate})` : "";
      console.log(`    [subj] ✗ ${g.expectation}${rate}`);
      console.log(`             ${g.reason}`);
    }
  }

  // Summary
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status !== "PASS").length;
  const flaky = results.filter((r) => r.flaky).length;

  console.log(`\n${"=".repeat(60)}`);
  console.log(
    `AGENT PROMPT RESULTS: ${results.length} prompts | ${passed} passed | ${failed} failed` +
      (flaky > 0 ? ` | ${flaky} flaky` : "")
  );
  console.log(`Provider: ${providerName} / ${EVAL_MODEL}`);
  console.log(`${"=".repeat(60)}\n`);

  // Write results
  const outPath = join(ROOT, "scripts", withSkills ? "agent-prompt-with-skills-eval-results.json" : "agent-prompt-eval-results.json");
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Results written to ${outPath}`);

  // GitHub Actions summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      `## AgentPrompt Eval Results (${providerName} / ${EVAL_MODEL})\n`,
      `| ID | Source Page | Status | Passed | Total | Flaky |`,
      `|----|-----------|--------|--------|-------|-------|`,
      ...results.map(
        (r) =>
          `| ${r.id} | ${r.source_page ?? "-"} | ${r.status === "PASS" ? "PASS" : "FAIL"} ${r.status} | ${r.passed ?? "-"} | ${r.total ?? "-"} | ${r.flaky ? "Yes" : "-"} |`
      ),
      "",
      `**Total: ${passed} passed, ${failed} failed across ${results.length} prompts**`,
    ].join("\n");

    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: "a" });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
