#!/usr/bin/env npx tsx
/**
 * Skills Eval Runner (Pi SDK)
 *
 * The Pi equivalent of tools/evals/scripts/run-evals.js. Discovers skill
 * evals, runs each prompt through a Pi session with the skill's SKILL.md
 * as context, evaluates with static checks + MCP fact-check + LLM judge,
 * and writes a dashboard-compatible report.
 *
 * Usage:
 *   npx tsx src/run-skills-eval.ts
 *   npx tsx src/run-skills-eval.ts --skill sui-move
 *   npx tsx src/run-skills-eval.ts --model anthropic/claude-opus-4-6
 *   npx tsx src/run-skills-eval.ts --concurrency 3
 *   npx tsx src/run-skills-eval.ts --timeout 120000
 *   npx tsx src/run-skills-eval.ts --judge-model claude-haiku-4-5-20251001
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, mkdtempSync } from "fs";
// First, so the patch is installed before the SDK makes a request. Inert unless
// EVAL_WIRE_LOG=1.
import "./wire-log.js";
// Second, so its patch wraps the logger's: the rewrite happens on the way out
// and the log then records the body that was actually sent, which is the only
// version worth reading when the question is why a request was rejected.
import "./cf-compat.js";
import { tmpdir } from "os";
import { searchKapaMCP } from "./layers.js";
import { summarise, wilson, type SampledEval } from "./stats.js";
import { join, resolve, dirname, basename } from "path";
import { pathToFileURL } from "node:url";

import { createEvalSession, type EvalSession } from "./harness.js";
import { evaluateResponse, countCodeBlocks, countHedges, passRateToScore } from "./static-eval.js";
import { loadAllSkills } from "./layers.js";
import {
  factCheckFailedExpectations,
  recalculateAfterFactCheck,
  type FactCheckedExpectation,
} from "./extensions/mcp-fact-checker.js";

// ── Paths ────────────────────────────────────────────────────────────

/**
 * One flag, read before the CLI block below, which this needs and which needs
 * nothing from here.
 */
function flagBeforeArgs(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] ?? null : null;
}

const PI_EVALS_DIR = resolve(dirname(new URL(import.meta.url).pathname), "..");
const EVALS_DIR = resolve(PI_EVALS_DIR, "../evals");
/**
 * Where the per-model reports land.
 *
 * It used to be derived from this file's location alone -- a sibling `evals`
 * directory two levels up -- which was true of the private repository this
 * runner came from and is a path that does not exist here. A runner that can
 * only write next to its old neighbours is not portable, so the directory is an
 * argument, with that layout as the fallback.
 */
const REPORTS_DIR = resolve(
  flagBeforeArgs("reports-dir") ?? process.env.REPORTS_DIR ?? resolve(EVALS_DIR, "reports"),
);

// ── CLI args ─────────────────────────────────────────────────────────

function getFlag(name: string): string | null {
  const args = process.argv.slice(2);
  const prefixed = args
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")[1];
  if (prefixed) return prefixed;
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] ?? null : null;
}

const modelFlag = getFlag("model");
const skillFilter = getFlag("skill");
const concurrencyFlag = getFlag("concurrency");
const timeoutFlag = getFlag("timeout");
const judgeModelFlag = getFlag("judge-model");
const noMcpCheck = process.argv.includes("--no-mcp-check");
const noLlmJudge = process.argv.includes("--no-llm-judge");

const EVAL_MODEL = modelFlag ?? process.env.EVAL_MODEL ?? "anthropic/claude-sonnet-4-6";
const JUDGE_MODEL = judgeModelFlag ?? process.env.JUDGE_MODEL ?? "claude-haiku-4-5-20251001";
const CONCURRENCY = parseInt(concurrencyFlag ?? "2", 10); // Lower default — each creates a Pi session
const EVAL_TIMEOUT = parseInt(timeoutFlag ?? "180000", 10); // 3 min per eval
const SKILLS_DIR = process.env.SKILLS_DIR;

/**
 * Which context this run gives the model.
 *
 * The suite exists to measure what the documentation is worth, and that needs more
 * than one configuration. Four of them already had names in layers.ts, where the
 * onboarding runner has used them for months:
 *
 *   baseline          nothing. What the model brought from training.
 *   with-skills       the skill for the eval being asked. The default, and what
 *                     every published run so far has been.
 *   with-skills-mcp   that skill, plus live documentation search for the prompt.
 *   mcp-only          search alone, no skill.
 *
 * This runner had a boolean -- skills or no skills -- which could not express the
 * two MCP layers at all. The layer is explicit rather than inferred from whether
 * SKILLS_DIR is set, because loadSkillContext falls back to EVALS_DIR, which also
 * carries skills: unsetting the variable would quietly keep loading them and
 * produce a baseline that is not one.
 *
 * Unlike the onboarding runner, the skills layers load only the skill the eval
 * belongs to. The question this suite asks is whether *that* skill teaches *that*
 * answer, and handing the model all thirty would answer a different one.
 */
const LAYERS = ["baseline", "with-skills", "with-skills-mcp", "mcp-only"] as const;
type Layer = (typeof LAYERS)[number];

const layerFlag = getFlag("layer") ?? process.env.EVAL_LAYER ?? null;
// --no-skills predates the layers and is the same thing as baseline. Kept so a
// workflow dispatched before this change still means what it said.
const LAYER: Layer = (process.argv.includes("--no-skills") || process.env.NO_SKILLS === "1")
  ? "baseline"
  : ((layerFlag as Layer) ?? "with-skills");
if (!LAYERS.includes(LAYER)) {
  console.error(`Unknown layer "${LAYER}". One of: ${LAYERS.join(", ")}`);
  process.exit(2);
}
/**
 * A suffix for this run's output files.
 *
 * The control this suite has never had is the same configuration run twice. It
 * tells you how much the score moves for reasons that have nothing to do with what
 * is in context, and without it a delta of -0.3 points cannot be told from a delta
 * of zero. A repeat run writes to the same filename as the run it is a control
 * for, so it would overwrite the thing it is meant to be compared against.
 */
const RUN_TAG = (getFlag("run-tag") ?? process.env.RUN_TAG ?? "").replace(/[^a-zA-Z0-9.-]/g, "");

/**
 * How many times to ask each question.
 *
 * One run is a sample, not a census, and everything this suite has published was
 * n=1. The skills A/B came back at 0.3 points with 31 evals better and 32 worse,
 * which is what the same configuration run twice would also produce, and there was
 * no way to tell the two apart because the second run had never been made.
 *
 * Default stays 1 so the full board costs what it always did. The core three run
 * with samples where the comparison actually has to hold weight.
 */
const SAMPLES = Math.max(1, parseInt(getFlag("samples") ?? process.env.EVAL_SAMPLES ?? "1", 10) || 1);

const WANTS_SKILLS = LAYER === "with-skills" || LAYER === "with-skills-mcp";
const WANTS_MCP = LAYER === "with-skills-mcp" || LAYER === "mcp-only";

const provider = EVAL_MODEL.split("/")[0] ?? "anthropic";

// How retrieval went, for the two layers that use it. A with-skills-mcp run where
// every search came back empty is a with-skills run wearing the wrong name.
let mcpHits = 0;
let mcpMisses = 0;
let mcpErrors = 0;

// Reference files present beside a SKILL.md that the SKILL.md never points at, so
// a run can report how much level 3 material it withheld.
let skippedReferences = 0;

// ── Types ────────────────────────────────────────────────────────────

interface SkillEval {
  id?: string;
  prompt: string;
  expected_output?: string;
  expectations: string[];
  deterministic_checks?: Array<{ type: string; value: string }>;
  subjective_expectations?: string[];
  type?: string;
}

interface JudgeGrade {
  expectation: string;
  pass: boolean;
  /** False when the judge could not be reached or returned nothing usable. */
  judged: boolean;
  reason: string;
}

interface SkillEvalResult {
  skill: string;
  eval_id: string;
  status: string;
  score: number;
  /**
   * Which grader the status came from. A keyword matcher cannot tell whether an
   * answer satisfies "warns that each transfer grants full privileges", so the
   * judge decides and this records that it did. "static" means the judge was
   * unavailable and the verdict fell back to term matching -- a weaker claim,
   * and the report says so rather than presenting the two as equivalent.
   */
  gradedBy: "judge" | "static";
  staticScore: { passed: number; total: number; passRate: number };
  llmScore: { passed: number; total: number; passRate: number };
  /**
   * Expectations the two graders disagree about. This is the tripwire: a broad
   * cluster of staticFailJudgePass means the term matcher is broken, which is
   * exactly how 266 expectations came to be unpassable by any correct answer
   * without anyone noticing. judgeFailStaticPass means an expectation is being
   * passed on a coincidental word.
   */
  divergence: { staticFailJudgePass: string[]; judgeFailStaticPass: string[] };
  staticGrades: Array<{
    expectation: string;
    passed: boolean;
    mcpFactCheck?: { verdict: string; reason: string };
    overridden?: boolean;
  }>;
  llmGrades: Array<{ expectation: string; pass: boolean; judged: boolean; reason: string }>;
  passed: number;
  total: number;
  grades: unknown[];
  response_excerpt: string;
  error?: string;
}

interface SkillSummary {
  skill: string;
  totalEvals: number;
  staticPassRate: number;
  llmPassRate: number;
  gradedBy: "judge" | "static";
  score: number;
}

// ── Semaphore ────────────────────────────────────────────────────────

class Semaphore {
  private _max: number;
  private _active = 0;
  private _queue: Array<() => void> = [];

  constructor(max: number) {
    this._max = max;
  }

  async acquire(): Promise<void> {
    if (this._active < this._max) {
      this._active++;
      return;
    }
    await new Promise<void>((resolve) => this._queue.push(resolve));
  }

  release(): void {
    this._active--;
    if (this._queue.length > 0) {
      this._active++;
      this._queue.shift()!();
    }
  }
}

// ── Timeout helper ───────────────────────────────────────────────────

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Eval timed out after ${ms}ms: ${label}`)),
        ms,
      ),
    ),
  ]);
}

// ── Where the tools may look ─────────────────────────────────────────
//
// The layer decides what the model is given, and until now it only decided what
// went into the system prompt. The tools were rooted in the skill's own
// directory whenever tools were on, for every layer, so a baseline run got no
// skill text in context and then read SKILL.md off disk with ls and read.
//
// It did exactly that: a baseline haiku-4-5 run made 1188 tool calls across 456
// of 474 attempts and scored 90.6%, against 87.1% with the skills in context.
// mcp-only made 1205 across 454 and scored 89.5%. Three layers inside 3.5
// points, because all three were the same configuration wearing different names,
// and the board was one commit away from publishing "the skills are worth -3.6
// points".
//
// Tools stay available in every layer: the comparison is about what the model
// can read, not whether it can read. A layer without the skills is rooted in an
// empty directory instead, so looking is allowed and finding is not.
export function toolRootFor(
  layer: string,
  skillsDir: string | null,
  skillName: string,
  emptyDir: string | null,
): string | null {
  const wantsSkills = layer === "with-skills" || layer === "with-skills-mcp";
  if (wantsSkills && skillsDir) return join(skillsDir, skillName);
  return emptyDir;
}

// ── Pass rate to score ───────────────────────────────────────────────
//
// This was a byte-identical copy of the shared banding function, which is the
// drift that static-eval.ts's header is about: the matcher was fixed in the
// shared module and the copy here kept grading the published matrix with the
// old rules. A band is a scoring decision, so it lives in one place and is
// imported, like the checker beside it.

// ── Discover eval files ──────────────────────────────────────────────

/**
 * Discover evals.json files from the skills directory structure.
 * Looks for {skillDir}/{skillName}/evals/evals.json patterns.
 */
/**
 * `template` is the scaffold a new skill is copied from, not a skill.
 *
 * It ships evals, so it reached the suite and was scored like everything else.
 * Its questions are placeholders -- "The output follows the skill's rules" is
 * one of them -- and no model has ever satisfied that, which is correct: there
 * are no rules, it is a blank form. Of the three expectations in the whole suite
 * that no model has ever met, one is this. The board already filters `template`
 * out of its weak-skill list and its install picker; it should never have been
 * scored in the first place.
 *
 * EVAL_INCLUDE_TEMPLATE=1 puts it back, for anyone working on the scaffold.
 */
const NOT_A_SKILL = new Set(
  process.env.EVAL_INCLUDE_TEMPLATE === "1" ? [] : ["template"],
);

export function discoverEvalFiles(): Array<{ path: string; skill: string }> {
  const searchDirs = [SKILLS_DIR, EVALS_DIR].filter(Boolean) as string[];
  const found: Array<{ path: string; skill: string }> = [];

  for (const searchDir of searchDirs) {
    if (!existsSync(searchDir)) continue;

    try {
      const entries = readdirSync(searchDir);
      for (const entry of entries) {
        const evalsJsonPath = join(searchDir, entry, "evals", "evals.json");
        if (existsSync(evalsJsonPath)) {
          if (skillFilter && entry !== skillFilter) continue;
          // Asked for by name, the scaffold still runs: that is someone working
          // on it deliberately, not the suite picking it up.
          if (!skillFilter && NOT_A_SKILL.has(entry)) continue;
          found.push({ path: evalsJsonPath, skill: entry });
        }
      }
    } catch {
      // Skip directories we cannot read
    }
  }

  // Deduplicate by skill name (prefer SKILLS_DIR)
  const bySkill = new Map<string, { path: string; skill: string }>();
  for (const entry of found) {
    if (!bySkill.has(entry.skill)) {
      bySkill.set(entry.skill, entry);
    }
  }

  return [...bySkill.values()];
}

// ── Load skill context ───────────────────────────────────────────────

/**
 * The system prompt a model answers under.
 *
 * On a layer without skills the context is empty, and the sentence introducing it has to go
 * with it. Left in, the baseline prompt read "Use the following skill reference to
 * answer the user's question." followed by nothing -- an instruction pointing at an
 * absent document, which invites a model to hedge or to answer that it cannot see
 * the reference. The baseline would then be measuring a broken prompt, and in the
 * direction that flatters the library: the gap the public page attributes to the
 * documentation would be partly the gap between a working prompt and a broken one.
 */
export function buildSystemPrompt(skillContext: string, mcpContext = ""): string {
  const base = "You are an expert Sui blockchain developer assistant.";
  const parts: string[] = [];
  if (skillContext.trim()) {
    parts.push(`Use the following skill reference to answer the user's question.\n\n${skillContext}`);
  }
  if (mcpContext.trim()) {
    // Named as search results, not as more skill. A model told "here is the skill"
    // over a passage retrieved for this one question will cite it as settled
    // guidance, and the mcp-only layer would then be measuring a skill that does
    // not exist.
    parts.push(
      `The following passages were retrieved from the Sui documentation for this question. `
      + `They are search results, not a curated guide; use them where they apply.\n\n${mcpContext}`,
    );
  }
  return parts.length ? `${base} ${parts.join("\n\n")}` : base;
}


/**
 * Load a reference file only when SKILL.md actually points at it.
 *
 * The Agent Skills standard is tiered. SKILL.md is level 2 and loads when the
 * skill is selected; everything beside it is level 3 and loads only when the level
 * 2 instructions tell the agent to go and read it. The whole reason the format
 * scales is that level 3 costs nothing until it is needed.
 *
 * This runner ignored that and concatenated every .md in the directory. 22 of 43
 * skills ship extra files, so for half the library the model was handed material a
 * production agent would have had to decide to fetch. Every with-skills number
 * this suite has published is therefore optimistic against real use, and the
 * optimism is uneven: it is largest for the skills with the most reference
 * material.
 *
 * EAGER_REFERENCES=1 restores the old behaviour, because the gap between the two
 * is worth being able to measure rather than just assert.
 */
const EAGER_REFERENCES = process.env.EAGER_REFERENCES === "1";

export function referencedFiles(skillBody: string, available: string[]): string[] {
  if (!available.length) return [];
  return available.filter((f) => {
    const escaped = f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // A mention is a mention: a markdown link, a backticked path, or the bare
    // filename in prose all count as the skill telling the agent to read it.
    //
    // Both boundaries matter. "xapi-reference.md" is not a reference to
    // "api-reference.md", and "deep-dive.md.bak" is not a reference to
    // "deep-dive.md" -- but "read examples.md." at the end of a sentence is. So a
    // trailing dot only breaks the match when something word-like follows it.
    const before = `(?:^|[\\s(\`"'/\\[])`;
    const after = `(?![A-Za-z0-9_-])(?!\\.[A-Za-z0-9])`;
    return new RegExp(`${before}${escaped}${after}`).test(skillBody);
  });
}

function loadSkillContext(skillName: string): string {
  if (!WANTS_SKILLS) return "";
  const searchDirs = [SKILLS_DIR, EVALS_DIR].filter(Boolean) as string[];

  for (const searchDir of searchDirs) {
    const skillDir = join(searchDir, skillName);
    const skillMd = join(skillDir, "SKILL.md");
    if (!existsSync(skillMd)) continue;

    const body = readFileSync(skillMd, "utf-8");
    const parts: string[] = [`# ${skillName} -- SKILL.md\n\n${body}`];

    try {
      const available = readdirSync(skillDir).filter(
        (f) => f.endsWith(".md") && f !== "SKILL.md",
      ).sort();
      const wanted = EAGER_REFERENCES ? available : referencedFiles(body, available);
      skippedReferences += available.length - wanted.length;
      for (const f of wanted) {
        parts.push(
          `# ${skillName} -- ${f}\n\n${readFileSync(join(skillDir, f), "utf-8")}`,
        );
      }
    } catch {
      // Unreadable directory; SKILL.md alone is still a valid context.
    }

    return parts.join("\n\n---\n\n");
  }

  return "";
}

// ── Parse eval file ──────────────────────────────────────────────────

function parseEvals(filePath: string): SkillEval[] {
  const raw = JSON.parse(readFileSync(filePath, "utf-8"));
  if (Array.isArray(raw)) return raw;
  if (raw.evals && Array.isArray(raw.evals)) return raw.evals;
  throw new Error(`Unexpected eval format in ${filePath}`);
}

// ── LLM judge ────────────────────────────────────────────────────────

export async function judgeResponse(
  prompt: string,
  response: string,
  expectations: string[],
  expectedOutput: string,
): Promise<JudgeGrade[]> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return expectations.map((e) => ({
      expectation: e,
      pass: false,
      judged: false,
      reason: "ANTHROPIC_API_KEY not set -- LLM judge skipped",
    }));
  }

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

Return ONLY valid JSON -- an array where each entry has:
  { "index": <1-based>, "expectation": "<the expectation text>", "pass": true/false, "reason": "<brief explanation>" }

Do not include any text outside the JSON array.`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        max_tokens: 2048,
        // A grader that returns a different verdict on the same answer is adding
        // its own variance to a measurement that already has the model's. Pinned
        // so re-grading the same response is as close to repeatable as the API
        // allows -- and so the A/B harness, which compares two sides, is not
        // reading scorer noise as a difference between them.
        temperature: 0,
        messages: [{ role: "user", content: judgePrompt }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      throw new Error(`Judge API error: ${resp.status}`);
    }

    const data = (await resp.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error(`Judge did not return valid JSON`);
    }

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      expectation?: string;
      pass?: boolean;
      reason?: string;
    }>;
    // Grade by position against the list we sent: the judge echoes the
    // expectation text and can reword it, so matching on that would silently
    // drop grades.
    return expectations.map((e, i) => ({
      expectation: e,
      pass: parsed[i]?.pass === true,
      judged: typeof parsed[i]?.pass === "boolean",
      reason: parsed[i]?.reason ?? "No grade returned for this expectation",
    }));
  } catch (err) {
    // judged: false, not pass: false. A judge that could not answer has not
    // found the expectation unmet, and the verdict must not be built on it.
    return expectations.map((e) => ({
      expectation: e,
      pass: false,
      judged: false,
      reason: `Judge error: ${(err as Error).message.slice(0, 100)}`,
    }));
  }
}



// ── Mechanical graders, loaded from the skills checkout ──────────────────────
//
// An expectation naming a literal -- "Uses assert_eq!", "Does NOT use `public
// entry`" -- is settled by a written pattern rather than by a reader. The patterns
// live beside the evals in MystenLabs/skills, so they travel with the data they
// grade and one implementation serves every runner. When the checkout predates
// them this stays empty and the judge grades everything, as before.
type Grader = { type: string; [k: string]: unknown };
type GraderModule = {
  gradeMechanically: (ev: unknown, response: string) => Array<{ expectation: string; graded: boolean; pass?: boolean; reason?: string }>;
  mergeGrades: (mechanical: unknown[], judged: unknown[]) => Array<{ expectation: string; pass: boolean; reason: string; by: string }>;
};
let graderModule: GraderModule | null = null;
async function loadGraders(): Promise<GraderModule | null> {
  if (graderModule || !SKILLS_DIR) return graderModule;
  const file = join(SKILLS_DIR, "..", "scripts", "lib", "graders.js");
  const alt = join(SKILLS_DIR, "scripts", "lib", "graders.js");
  for (const candidate of [alt, file]) {
    if (!existsSync(candidate)) continue;
    try {
      graderModule = (await import(pathToFileURL(candidate).href)) as GraderModule;
      console.log(`Mechanical graders loaded from ${candidate}`);
      return graderModule;
    } catch (err) {
      console.warn(`Could not load graders from ${candidate}: ${(err as Error).message}`);
    }
  }
  return null;
}

// ── Deciding the verdict ─────────────────────────────────────────────

/**
 * Who decided, what they decided, and where the two graders disagree.
 *
 * The judge decides, because the expectations are prose -- "warns that each
 * transfer grants full privileges" is not a string to look for. Term matching
 * still runs, and the disagreement between them is the instrument's own alarm:
 * a standing cluster of staticFailJudgePass means the matcher is broken, which is
 * how 266 expectations came to be unpassable by any correct answer with nothing
 * to show it.
 *
 * The judge only decides over expectations it actually graded. A judge that timed
 * out has not found anything unmet, so a partial result falls back to term
 * matching and records that it did, rather than quietly reporting a weaker
 * verdict as though a judge had read the answer.
 */
export function decideVerdict(
  staticGrades: Array<{ expectation: string; passed: boolean }>,
  judgeGrades: JudgeGrade[],
): {
  status: "PASS" | "FAIL";
  gradedBy: "judge" | "static";
  judgePassRate: number;
  divergence: { staticFailJudgePass: string[]; judgeFailStaticPass: string[] };
} {
  const judged = judgeGrades.filter((g) => g.judged);
  const complete = judged.length > 0 && judged.length === judgeGrades.length;
  const gradedBy: "judge" | "static" = complete ? "judge" : "static";

  const staticPassed = new Set(
    staticGrades.filter((g) => g.passed).map((g) => g.expectation),
  );

  return {
    status: complete
      ? judged.every((g) => g.pass) ? "PASS" : "FAIL"
      : staticGrades.every((g) => g.passed) ? "PASS" : "FAIL",
    gradedBy,
    judgePassRate: judged.length
      ? judged.filter((g) => g.pass).length / judged.length
      : 0,
    divergence: {
      staticFailJudgePass: judged
        .filter((g) => g.pass && !staticPassed.has(g.expectation))
        .map((g) => g.expectation),
      judgeFailStaticPass: judged
        .filter((g) => !g.pass && staticPassed.has(g.expectation))
        .map((g) => g.expectation),
    },
  };
}

// ── Run a single eval ────────────────────────────────────────────────

const evalSemaphore = new Semaphore(CONCURRENCY);

// A model that answers nothing is not a model that scores zero. Counted so a
// run where every call failed can be told apart from a run where the model
// genuinely did badly.
let emptyResponses = 0;

/**
 * How many times to ask again when the provider returns nothing.
 *
 * Three, because the failures seen were a throttle window: gpt-5.5 answered the
 * first 58 questions, degraded over the next 30, failed 42 consecutively, and then
 * recovered completely for the last 26. Nothing about the questions changed; the
 * provider was squeezing a key that four concurrent jobs were sharing. A window
 * like that is exactly what a retry is for.
 */
const EMPTY_RETRIES = 3;
let retriedPrompts = 0;

/**
 * Whether the model can read files while it answers.
 *
 * Eval sessions have always run with `tools: []`, which makes every number this
 * suite publishes a measurement of an agent that cannot open a file. That is not
 * the agent anyone uses, and it quietly decides an argument it should not: the
 * Agent Skills standard puts situational detail in references/ and expects the
 * agent to fetch it when the instructions point there. With no tools, level 3 can
 * never load, so following the standard strictly removes material rather than
 * deferring it. Rewriting accessing-data to the letter of the guidance scored 5.4
 * points lower here for exactly that reason.
 *
 * On by default now. It was off for one run, to measure what turning it on does,
 * and the answer settled the question: accessing-data scored 26.8% without tools
 * and 87.5% with them, and the eval that had failed 0 of 7 across four consecutive
 * authoring treatments passed 7 of 7. A suite that forbids the agent from opening a
 * file is not measuring a hard question, it is measuring its own restriction.
 *
 * Every card produced before this was made without tools, so those numbers describe
 * a different thing and the board keeps them in a separate regime rather than
 * ranking them together. --no-tools reproduces the old behaviour for comparison.
 *
 * The other pipelines were already right: run-onboarding passes read, grep and ls
 * through layers.ts, and run-e2e-integration disables the built-ins on purpose
 * because it supplies its own sandbox tools. run-unbranded and
 * run-competitor-benchmark stay tool-free, since neither loads a skill and there is
 * nothing for the model to go and read.
 */
const WITH_TOOLS = process.argv.includes("--no-tools") || process.env.EVAL_TOOLS === "0"
  ? false
  : true;
const EVAL_TOOLS = ["read", "grep", "ls"];

/** Tool calls the model actually made. If it never reaches for a file, that is the
 * finding, and it is indistinguishable from tools being off unless it is counted. */
let toolCalls = 0;
// Created once, and only when a layer without the skills has tools to point
// somewhere harmless.
const EMPTY_TOOL_ROOT =
  WITH_TOOLS && !WANTS_SKILLS ? mkdtempSync(join(tmpdir(), "eval-no-skills-")) : null;
// Once per attempt, not once per eval: `attempt` below is the retry index, so
// this increments on the first try of each sample. At 3 samples it counts up to
// 474 against 158 evals, and it was named and reported as though it counted
// evals, which read as "465 of 158 evals".
let attemptsUsingTools = 0;

async function runSingleEval(
  ev: SkillEval,
  skillName: string,
  skillContext: string,
  index: number,
  sample = 0,
): Promise<{
  result: SkillEvalResult;
  staticPassed: number;
  staticFailed: number;
  llmPassed: number;
  llmFailed: number;
}> {
  const evalId = ev.id ?? `${skillName}-${index + 1}`;
  void sample; // identity only; the sample index does not change the request

  await evalSemaphore.acquire();
  let session: EvalSession | undefined;

  try {
    const work = async () => {
      // Retrieval is per question. The layer is "search the documentation for
      // this prompt", so searching once per skill and reusing the result would
      // measure a worse version of the thing being tested.
      let mcpContext = "";
      if (WANTS_MCP) {
        try {
          mcpContext = await searchKapaMCP(ev.prompt);
          if (mcpContext) mcpHits += 1;
          else mcpMisses += 1;
        } catch {
          // A retrieval failure is not a model failure. It is counted and the
          // model answers without it, and the count is reported so a layer that
          // silently degraded into its no-MCP sibling is visible.
          mcpErrors += 1;
        }
      }
      const systemPrompt = buildSystemPrompt(skillContext, mcpContext);

      // Create a Pi eval session — no tools needed for knowledge evals
      session = await createEvalSession({
        model: EVAL_MODEL,
        systemPrompt,
        // With tools on, the working directory is the skills checkout so a path
        // like references/grpc.md that the skill names actually resolves.
        tools: WITH_TOOLS ? EVAL_TOOLS : [],
        ...(() => {
          const root = toolRootFor(LAYER, SKILLS_DIR, skillName, EMPTY_TOOL_ROOT);
          return WITH_TOOLS && root ? { cwd: root } : {};
        })(),
        // Explicit, though createEvalSession now defaults to it. The judge has
        // been pinned at 0 since the grading rewrite and the model being graded
        // was not, so every A/B between two layers carried a full run's worth of
        // sampling variance on both sides.
        temperature: 0,
      });

      // Run the prompt, retrying a silent failure.
      //
      // The provider returns an empty string rather than raising when it throttles,
      // so a squeezed request looked exactly like a model with nothing to say, and
      // with no retry each one became a permanently unanswered question. gpt-5.5
      // lost 55 of 158 that way while four of its jobs ran at once against one key.
      //
      // Backoff is exponential with jitter, because every worker in the run hits
      // the same wall at the same moment and a fixed delay would send them all back
      // together.
      let response = "";
      for (let attempt = 0; attempt < EMPTY_RETRIES; attempt++) {
        if (attempt > 0) {
          const wait = Math.round(1000 * 2 ** attempt * (0.5 + Math.random()));
          retriedPrompts += 1;
          await new Promise((r) => setTimeout(r, wait));
        }
        const piResult = await session.runPrompt(ev.prompt);
        response = piResult.response ?? "";
        // Counted rather than assumed. Giving a model tools it never reaches for
        // produces the same numbers as not giving them, and the two are only
        // distinguishable if the reaching is recorded.
        const used = piResult.toolCalls?.length ?? 0;
        if (used > 0) { toolCalls += used; if (attempt === 0) attemptsUsingTools += 1; }
        if (response.trim()) break;
      }

      // An unanswered question is not a wrong answer.
      //
      // runPrompt can return an empty string without throwing, so nothing here
      // raised and the empty answer went on to be graded: every expectation failed,
      // the eval scored 0, and it entered the denominator as a question the model
      // got wrong. gpt-5.5 given the skills and retrieval together returned nothing
      // for 55 of 158, and the card published 26.5% with a third of it being
      // silence.
      //
      // Thrown is the right shape: the catch below already records status ERROR
      // with a reason and contributes no grades, so an unanswered question leaves
      // the denominator instead of dragging the score down.
      if (!response || !response.trim()) {
        emptyResponses += 1;
        throw new Error("The model returned an empty response");
      }

      // Resolve expectations (support both old and new format)
      const expectations =
        ev.subjective_expectations ?? ev.expectations ?? [];

      // 1. Static check (primary, deterministic)
      const staticResult = evaluateResponse(response, expectations);

      // 2. MCP fact-check failed static expectations
      let factCheckedResults: FactCheckedExpectation[] = staticResult.checks.map(
        (c) => ({
          ...c,
          isNegative: /^Does NOT|^NOT |^Should NOT|^Must NOT|^Never /i.test(
            c.expectation,
          ),
        }),
      );

      let finalStaticPassed = staticResult.passed;
      let finalStaticTotal = staticResult.total;
      let finalStaticPassRate = staticResult.passRate;
      let finalStaticScore = staticResult.score;

      if (!noMcpCheck && staticResult.passed < staticResult.total) {
        try {
          factCheckedResults = await factCheckFailedExpectations(
            factCheckedResults,
            response,
            ev.prompt,
          );
          const recalculated = recalculateAfterFactCheck(factCheckedResults);
          finalStaticPassed = recalculated.passed;
          finalStaticTotal = recalculated.total;
          finalStaticPassRate = recalculated.passRate;
          finalStaticScore = recalculated.score;
        } catch {
          // MCP fact-check failed — continue with static results only
        }
      }

      // 3. Mechanical graders first, then the judge for what is left.
      //
      // The judge reads prose, which is most of these expectations. The ones naming
      // a literal do not need reading, and sending them to a judge pays for an
      // opinion about whether `assert_eq!` is present.
      const graders = await loadGraders();
      type Mech = { expectation: string; graded: boolean; pass?: boolean; reason?: string };
      const mechanical: Mech[] = graders
        ? graders.gradeMechanically(ev, response)
        : expectations.map((e) => ({ expectation: e, graded: false }));
      const forJudge = expectations.filter((_, i) => !mechanical[i]?.graded);

      const judged: JudgeGrade[] = noLlmJudge
        ? forJudge.map(e => ({ expectation: e, pass: false, judged: false, reason: "LLM judge skipped" }))
        : forJudge.length
          ? await judgeResponse(ev.prompt, response, forJudge, ev.expected_output ?? "")
          : [];

      // Weave the two back together in the eval's own order. A grader's verdict is
      // recorded as judged, because it is a decision and not an absence of one.
      let j = 0;
      const llmGrades: JudgeGrade[] = mechanical.map((m) => {
        if (m.graded) {
          return { expectation: m.expectation, pass: m.pass === true, judged: true, reason: m.reason ?? "grader" };
        }
        const g = judged[j++];
        return {
          expectation: m.expectation,
          pass: g?.pass === true,
          judged: g?.judged === true,
          reason: g?.reason ?? "no grade returned for this expectation",
        };
      });

      return { response, factCheckedResults, finalStaticPassed, finalStaticTotal, finalStaticPassRate, finalStaticScore, llmGrades };
    };

    const {
      response,
      factCheckedResults,
      finalStaticPassed,
      finalStaticTotal,
      finalStaticPassRate,
      finalStaticScore,
      llmGrades,
    } = await withTimeout(work(), EVAL_TIMEOUT, evalId);

    const llmPassed = llmGrades.filter((g) => g.pass).length;
    // Only what the judge actually graded. Counting ungraded expectations in the
    // denominator turns an outage into a score of zero.
    const llmTotal = llmGrades.filter((g) => g.judged).length;
    const staticFailed = finalStaticTotal - finalStaticPassed;

    // The judge decides, but only over expectations it actually graded. If it
    // graded none -- no key, an outage, unparseable output -- the verdict falls
    // back to term matching and says so, because reporting a static verdict as
    // though a judge had read the answer is the kind of quiet overstatement that
    // took months to find last time.
    const verdict = decideVerdict(factCheckedResults, llmGrades);
    const { status, gradedBy, divergence } = verdict;

    return {
      result: {
        skill: skillName,
        eval_id: evalId,
        status,
        score: gradedBy === "judge"
          ? passRateToScore(verdict.judgePassRate)
          : finalStaticScore,
        gradedBy,
        divergence,
        staticScore: {
          passed: finalStaticPassed,
          total: finalStaticTotal,
          passRate:
            Math.round(finalStaticPassRate * 1000) / 1000,
        },
        llmScore: {
          passed: llmPassed,
          total: llmTotal,
          passRate:
            Math.round(
              (llmTotal > 0 ? llmPassed / llmTotal : 0) * 1000,
            ) / 1000,
        },
        staticGrades: factCheckedResults.map((r) => ({
          expectation: r.expectation,
          passed: r.passed,
          ...(r.mcpFactCheck ? { mcpFactCheck: r.mcpFactCheck } : {}),
          ...(r.overridden ? { overridden: true } : {}),
        })),
        llmGrades: llmGrades.map((g) => ({
          expectation: g.expectation,
          pass: g.pass,
          judged: g.judged,
          reason: g.reason,
        })),
        passed: finalStaticPassed,
        total: finalStaticTotal,
        grades: llmGrades,
        response_excerpt: response.slice(0, 200),
      },
      staticPassed: finalStaticPassed,
      staticFailed,
      llmPassed,
      llmFailed: llmTotal - llmPassed,
    };
  } catch (err) {
    return {
      result: {
        skill: skillName,
        eval_id: evalId,
        status: "ERROR",
        score: 0,
        gradedBy: "static",
        divergence: { staticFailJudgePass: [], judgeFailStaticPass: [] },
        staticScore: { passed: 0, total: 0, passRate: 0 },
        llmScore: { passed: 0, total: 0, passRate: 0 },
        staticGrades: [],
        llmGrades: [],
        passed: 0,
        total: 0,
        grades: [],
        response_excerpt: "",
        error: (err as Error).message.slice(0, 200),
      },
      staticPassed: 0,
      staticFailed: 1,
      llmPassed: 0,
      llmFailed: 1,
    };
  } finally {
    session?.dispose();
    evalSemaphore.release();
  }
}

// ── Run all evals for a single skill ─────────────────────────────────

async function runSkillEvals(evalFile: {
  path: string;
  skill: string;
}): Promise<
  Array<{
    result: SkillEvalResult;
    staticPassed: number;
    staticFailed: number;
    llmPassed: number;
    llmFailed: number;
  }>
> {
  const evals = parseEvals(evalFile.path);
  const skillContext = loadSkillContext(evalFile.skill);

  // Each eval is asked SAMPLES times. The attempts are flattened into one list so
  // the existing semaphore still bounds concurrency across the whole run rather
  // than per eval.
  const attempts = await Promise.all(
    evals.flatMap((ev, i) =>
      Array.from({ length: SAMPLES }, (_, sample) =>
        runSingleEval(ev, evalFile.skill, skillContext, i, sample),
      ),
    ),
  );

  // Fold the attempts back into one record per eval. The first attempt is the
  // one reported in the fields every consumer already reads, so nothing
  // downstream has to know about sampling; `samples` carries the rest.
  const results = evals.map((ev, i) => {
    const mine = attempts.slice(i * SAMPLES, (i + 1) * SAMPLES);
    const first = mine[0];
    if (SAMPLES === 1) return first;
    const passes = mine.filter((a) => a.result.status === "PASS").length;
    const rates = mine.map((a) => a.result.llmScore.passRate);
    return {
      ...first,
      result: {
        ...first.result,
        samples: {
          k: SAMPLES,
          // How many attempts satisfied every expectation. This is the unit
          // pass@k and pass^k are computed over.
          passed: passes,
          // The per-attempt expectation rates, so the spread is recoverable
          // without re-running anything.
          rates,
          statuses: mine.map((a) => a.result.status),
        },
      },
    };
  });

  // Print results
  console.log(
    `\n${"--"} ${evalFile.skill} (${evals.length} evals) ${"--"}`,
  );
  for (const { result } of results) {
    if (result.status === "ERROR") {
      console.log(`  ${result.eval_id} ... ERROR: ${result.error}`);
    } else {
      const staticTag = `static=${result.staticScore.passed}/${result.staticScore.total}`;
      const llmTag = `llm=${result.llmScore.passed}/${result.llmScore.total}`;
      console.log(
        `  ${result.eval_id} ... ${result.status} (${staticTag}, ${llmTag}, score=${result.score})`,
      );
    }
  }

  return results;
}

// ── Build per-skill summary ──────────────────────────────────────────

function buildSkillSummary(
  skillName: string,
  skillResults: Array<{
    result: SkillEvalResult;
    staticPassed: number;
    staticFailed: number;
  }>,
): SkillSummary {
  const evals = skillResults.map((r) => r.result);
  const totalEvals = evals.length;

  const staticPassRates = evals
    .filter((e) => e.status !== "ERROR")
    .map((e) => e.staticScore.passRate);
  const llmPassRates = evals
    .filter((e) => e.status !== "ERROR")
    .map((e) => e.llmScore.passRate);

  const avgStaticPassRate =
    staticPassRates.length > 0
      ? Math.round(
          (staticPassRates.reduce((a, b) => a + b, 0) /
            staticPassRates.length) *
            1000,
        ) / 1000
      : 0;
  const avgLlmPassRate =
    llmPassRates.length > 0
      ? Math.round(
          (llmPassRates.reduce((a, b) => a + b, 0) / llmPassRates.length) *
            1000,
        ) / 1000
      : 0;

  // Scored on the judge's rate when the judge graded these evals, because that
  // is the number the status is built from. Falling back to the static rate here
  // while the status came from the judge would put two different measurements
  // under one heading.
  const judgeLed = evals.some((e) => e.gradedBy === "judge");

  return {
    skill: skillName,
    totalEvals,
    staticPassRate: avgStaticPassRate,
    llmPassRate: avgLlmPassRate,
    gradedBy: judgeLed ? ("judge" as const) : ("static" as const),
    score: passRateToScore(judgeLed ? avgLlmPassRate : avgStaticPassRate),
  };
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const evalFiles = discoverEvalFiles();

  if (evalFiles.length === 0) {
    console.log("No eval files to run.");
    if (skillFilter) {
      console.error(`No evals found for skill: ${skillFilter}`);
    }
    process.exit(0);
  }

  console.log(`\nSkills Eval Runner (Pi SDK)`);
  console.log(`  Runner         : pi-evals`);
  console.log(`  Provider       : ${provider}`);
  console.log(`  Model          : ${EVAL_MODEL}`);
  console.log(`  Judge model    : ${JUDGE_MODEL}`);
  console.log(`  Scoring        : static checks (primary) + MCP fact-check + LLM judge`);
  console.log(`  Concurrency    : ${CONCURRENCY}`);
  console.log(`  Timeout        : ${EVAL_TIMEOUT}ms`);
  console.log(`  Eval files     : ${evalFiles.length}`);
  console.log(
    `  Skills         : ${evalFiles.map((f) => f.skill).join(", ")}\n`,
  );

  // Run all skills
  const allSkillResults = await Promise.all(
    evalFiles.map(runSkillEvals),
  );

  // Aggregate
  const allResults: SkillEvalResult[] = [];
  let totalStaticPass = 0;
  let totalStaticFail = 0;
  let totalLlmPass = 0;
  let totalLlmFail = 0;
  let totalEvals = 0;

  const bySkill = new Map<
    string,
    Array<{
      result: SkillEvalResult;
      staticPassed: number;
      staticFailed: number;
    }>
  >();

  for (const skillResults of allSkillResults) {
    for (const entry of skillResults) {
      allResults.push(entry.result);
      totalStaticPass += entry.staticPassed;
      totalStaticFail += entry.staticFailed;
      totalLlmPass += entry.llmPassed;
      totalLlmFail += entry.llmFailed;
      totalEvals++;

      const skill = entry.result.skill;
      if (!bySkill.has(skill)) bySkill.set(skill, []);
      bySkill.get(skill)!.push(entry);
    }
  }

  // Build per-skill summaries
  const skillSummaries: SkillSummary[] = [];
  for (const [skillName, skillResults] of bySkill) {
    skillSummaries.push(buildSkillSummary(skillName, skillResults));
  }
  skillSummaries.sort((a, b) => a.staticPassRate - b.staticPassRate);

  // Aggregate scores
  const totalStaticExpectations = totalStaticPass + totalStaticFail;
  const totalLlmExpectations = totalLlmPass + totalLlmFail;
  const overallStaticPassRate =
    totalStaticExpectations > 0
      ? Math.round(
          (totalStaticPass / totalStaticExpectations) * 1000,
        ) / 1000
      : 0;
  const overallLlmPassRate =
    totalLlmExpectations > 0
      ? Math.round(
          (totalLlmPass / totalLlmExpectations) * 1000,
        ) / 1000
      : 0;

  // Which grader the run's verdicts actually came from, and where the two
  // disagree. The disagreement is the point: when the term matcher broke, 266
  // expectations became unpassable by any correct answer, and nothing surfaced
  // it because static was the only voice. A standing staticFailJudgePass cluster
  // says the matcher is wrong; judgeFailStaticPass says an expectation is being
  // passed on a word that happened to appear.
  const judgeLedEvals = allResults.filter((r) => r.gradedBy === "judge").length;
  const staticFellBack = allResults.filter(
    (r) => r.gradedBy === "static" && r.status !== "ERROR",
  ).length;
  const staticFailJudgePass = allResults.reduce(
    (a, r) => a + (r.divergence?.staticFailJudgePass.length ?? 0), 0);
  const judgeFailStaticPass = allResults.reduce(
    (a, r) => a + (r.divergence?.judgeFailStaticPass.length ?? 0), 0);

  // Judge-led needs the judge to have decided the run, not every last eval of it.
  //
  // Requiring staticFellBack === 0 made one timeout in 158 relabel a whole run as
  // term-matched. claude-fable-5's baseline had the judge decide 157 evals and
  // fall back on one, was published as "static", and the board then refused to
  // compare it with its own with-skills run -- which is the one comparison the
  // board exists for. The fallback count is reported either way, so a reader can
  // still see it; what it must not do is silently change the ruler's name.
  const JUDGE_LED_FLOOR = 0.95;
  const decidable = judgeLedEvals + staticFellBack;
  const gradedByJudge =
    judgeLedEvals > 0 && (decidable === 0 || judgeLedEvals / decidable >= JUDGE_LED_FLOOR);

  const aggregate = {
    totalEvals,
    totalExpectations: totalStaticExpectations,
    gradedBy: gradedByJudge ? ("judge" as const) : ("static" as const),
    judgeLedEvals,
    staticFellBack,
    staticPassRate: overallStaticPassRate,
    llmPassRate: overallLlmPassRate,
    divergence: {
      staticFailJudgePass,
      judgeFailStaticPass,
      // Share of graded expectations the two graders read differently.
      rate: totalLlmExpectations > 0
        ? Math.round(((staticFailJudgePass + judgeFailStaticPass) / totalLlmExpectations) * 1000) / 1000
        : 0,
    },
    overallScore: passRateToScore(
      gradedByJudge ? overallLlmPassRate : overallStaticPassRate,
    ),

    // What a single run could never report.
    //
    // `interval` is the Wilson bound on the headline rate. A rate quoted without
    // one invites the reader to treat 44.3% and 44.6% as different numbers, and on
    // this suite they are the same number.
    //
    // `sampling` only appears when the run asked each question more than once. It
    // carries the optimistic and pessimistic bounds, and the noise floor: the
    // spread of the score across identical attempts. A difference between two
    // configurations smaller than that floor is not a difference, which is the
    // check every A/B this suite has published went without.
    interval: (() => {
      const rate = gradedByJudge ? overallLlmPassRate : overallStaticPassRate;
      const n = gradedByJudge ? totalLlmExpectations : totalStaticExpectations;
      const w = wilson(Math.round(rate * n), n);
      return { low: Math.round(w.low * 1000) / 1000, high: Math.round(w.high * 1000) / 1000, n };
    })(),
    sampling: SAMPLES > 1 ? (() => {
      const sampled: SampledEval[] = allResults
        .filter((r) => (r as { samples?: unknown }).samples)
        .map((r) => {
          const sm = (r as unknown as { samples: { passed: number; k: number } }).samples;
          return { id: `${r.skill}/${r.eval_id}`, passed: sm.passed, samples: sm.k };
        });
      // One score per attempt, across the whole suite: attempt 0 of every eval is
      // one run of the suite, attempt 1 is another. The spread between those is
      // the noise floor.
      const perSample: number[] = [];
      for (let i = 0; i < SAMPLES; i++) {
        const rates = allResults
          .map((r) => (r as unknown as { samples?: { rates: number[] } }).samples?.rates?.[i])
          .filter((v): v is number => typeof v === "number");
        if (rates.length) perSample.push(rates.reduce((a, b) => a + b, 0) / rates.length);
      }
      return summarise(sampled, perSample, SAMPLES);
    })() : null,
  };

  // ── Console summary ──────────────────────────────────────────────
  if (aggregate.sampling) {
    const sm = aggregate.sampling;
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Sampling: ${SAMPLES} attempts per question`);
    console.log(`  pass@${sm.k}  ${(100 * sm.passAtK).toFixed(1)}%   at least one attempt answered it in full`);
    console.log(`  pass^${sm.k}  ${(100 * sm.passPowK).toFixed(1)}%   every attempt did, which is what a user gets`);
    console.log(`  ${sm.alwaysPass} always pass, ${sm.neverPass} never pass, ${sm.flaky} are flaky`);
    console.log(`  noise floor: score varies by ${(100 * sm.noiseFloor.sd).toFixed(2)} points (sd) across identical runs`);
    console.log(`  A difference smaller than that is not a difference.`);
  }
  console.log(`\n${"=".repeat(60)}`);
  console.log(`RESULTS (Pi SDK): ${totalEvals} evals`);
  console.log(
    `  Static: ${totalStaticPass}/${totalStaticExpectations} expectations passed (${Math.round(overallStaticPassRate * 100)}%)`,
  );
  console.log(
    `  LLM:    ${totalLlmPass}/${totalLlmExpectations} expectations passed (${Math.round(overallLlmPassRate * 100)}%)`,
  );
  console.log(`  Score:  ${aggregate.overallScore}/5  (verdict from the ${aggregate.gradedBy})`);
  console.log(
    `  Graders disagree on ${aggregate.divergence.staticFailJudgePass + aggregate.divergence.judgeFailStaticPass}` +
      ` of ${totalLlmExpectations} graded expectations (${Math.round(aggregate.divergence.rate * 100)}%):` +
      ` ${aggregate.divergence.staticFailJudgePass} the matcher failed and the judge passed,` +
      ` ${aggregate.divergence.judgeFailStaticPass} the other way.`,
  );
  if (aggregate.staticFellBack > 0) {
    console.log(
      `::warning title=Judge unavailable::${aggregate.staticFellBack} eval(s) fell back to term matching because the judge could not grade them. Those verdicts are weaker than the rest of this run.`,
    );
  }
  // A quarter of expectations read differently by the two graders is not nuance.
  if (aggregate.divergence.rate > 0.25) {
    console.log(
      `::warning title=Graders disagree broadly::${Math.round(aggregate.divergence.rate * 100)}% of graded expectations are read differently by the term matcher and the judge. Check whether an expectation's key terms still match what it asks for before trusting either number.`,
    );
  }
  console.log(`${"=".repeat(60)}`);

  console.log(`\nPer-skill breakdown:`);
  for (const s of skillSummaries) {
    const staticPct = Math.round(s.staticPassRate * 100);
    const llmPct = Math.round(s.llmPassRate * 100);
    console.log(
      `  ${s.skill.padEnd(30)} static=${staticPct}%  llm=${llmPct}%  score=${s.score}`,
    );
  }

  // ── Write results ────────────────────────────────────────────────
  const output = {
    metadata: {
      provider,
      model: EVAL_MODEL,
      judge_model: JUDGE_MODEL,
      runner: "pi-evals",
      // Which context this run had. The board pairs a model's two cards on this,
      // and labelled everything "+sui-skills" before it existed.
      skills: WANTS_SKILLS ? "sui-skills" : "none",
      layer: LAYER,
      // How many questions the model did not answer at all.
      //
      // This existed only as a console warning, so a results file carried no sign
      // that a third of its answers were silence. Everything downstream had to
      // infer it from the length of the stored excerpts, which is why a run with 55
      // empty answers reached the board as a score.
      empty_responses: emptyResponses,
      // Retries spent on silent provider failures. A run with a large number here
      // answered everything, but was fighting a throttle to do it, and its timing
      // is not comparable with a clean run's.
      retried_prompts: retriedPrompts,
      // Whether the model could open a file, and whether it did. A run with tools
      // enabled and zero calls is not the same measurement as one without them, and
      // not the same as one where the model read what the skill pointed at.
      tools: WITH_TOOLS ? EVAL_TOOLS : [],
      tool_calls: toolCalls,
      attempts_using_tools: attemptsUsingTools,
      // How the skill was loaded. "progressive" follows the standard's tiers and
      // withholds reference files SKILL.md does not point at; "eager" is the old
      // behaviour, which handed the model everything in the directory.
      disclosure: EAGER_REFERENCES ? "eager" : "progressive",
      skipped_references: skippedReferences,
      // Set on a control run, so a repeat of an existing configuration is not read
      // as a second model.
      run_tag: RUN_TAG || null,
      mcp: WANTS_MCP ? { hits: mcpHits, empty: mcpMisses, errors: mcpErrors } : null,
      // What actually decided this run's verdicts, not a constant. It read
      // "hybrid-static-llm" for every run including the ones the judge alone
      // graded, so a judge-scored run and a term-matched one were indistinguishable
      // on the public board and ranked against each other -- 15/158 beside 117/158,
      // where the only real difference was which grader read the answers.
      scoring: aggregate.gradedBy,
      judge_decided_evals: aggregate.judgeLedEvals,
      static_fallback_evals: aggregate.staticFellBack,
      timestamp: new Date().toISOString(),
    },
    aggregate,
    skillSummaries,
    results: allResults,
  };

  mkdirSync(REPORTS_DIR, { recursive: true });

  // Write per-model results file.
  //
  // The mode is part of the name. A baseline run is the same model under the same
  // judge against the same evals, so without the suffix it would land on the file
  // holding that model's with-skills result and overwrite it -- the comparison
  // would destroy the half it is being compared against, and the loss would be
  // silent because the replacement is a well-formed run of the right model.
  const modelLabel = EVAL_MODEL.split("/").pop()?.replace(/[^a-zA-Z0-9.-]/g, "-") ?? "unknown";
  // with-skills keeps the bare name: it is what every published file already is,
  // and renaming them would orphan the board's history.
  const base = LAYER === "with-skills" ? modelLabel : `${modelLabel}-${LAYER}`;
  const runLabel = RUN_TAG ? `${base}-${RUN_TAG}` : base;
  const perModelPath = join(REPORTS_DIR, `skills-eval-results-pi-${runLabel}.json`);
  writeFileSync(perModelPath, JSON.stringify(output, null, 2));
  console.log(`\nResults written to ${perModelPath}`);

  // Archive a dated copy for history
  const histDir = join(REPORTS_DIR, "history", "skills");
  mkdirSync(histDir, { recursive: true });
  const dateStr = new Date().toISOString().split("T")[0];
  writeFileSync(join(histDir, `${runLabel}-${dateStr}.json`), JSON.stringify(output, null, 2));

  // Also write the generic name (overwritten by last model to run).
  //
  // Not from a baseline run: this file is read as "the latest skills result", and a
  // run with nothing in context is not a weaker skills result, it is a different
  // measurement. Letting it land here would show the library performing worse than
  // it does.
  if (LAYER === "with-skills" && !RUN_TAG) {
    const outPath = join(REPORTS_DIR, "skills-eval-results-pi.json");
    writeFileSync(outPath, JSON.stringify(output, null, 2));
  }

  // ── History ──────────────────────────────────────────────────────
  const historyPath = join(REPORTS_DIR, "skills-eval-history-pi.json");
  let history: unknown[] = [];
  if (existsSync(historyPath)) {
    try {
      const raw = JSON.parse(readFileSync(historyPath, "utf-8"));
      if (Array.isArray(raw)) history = raw;
    } catch {
      // Start fresh
    }
  }
  history.push({
    date: new Date().toISOString().split("T")[0],
    timestamp: new Date().toISOString(),
    provider,
    model: EVAL_MODEL,
    // Recorded so a trend line can tell the two regimes apart. Without it a
    // baseline entry reads as the same model getting worse on the same day.
    // Named skillsContext, not skills: this record already carries a `skills`
    // key holding the per-skill summaries, and a second one of that name would
    // have been dropped by the later property without a word.
    skillsContext: WANTS_SKILLS ? "sui-skills" : "none",
    layer: LAYER,
    judgeModel: JUDGE_MODEL,
    runner: "pi-evals",
    aggregate,
    skills: skillSummaries,
  });
  if (history.length > 90) history = history.slice(-90);
  writeFileSync(historyPath, JSON.stringify(history, null, 2));
  console.log(`History appended to ${historyPath}`);

  // ── GitHub Actions summary ───────────────────────────────────────
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      `## Skill Eval Results - Pi (${provider} / ${EVAL_MODEL})\n`,
      `**Runner:** pi-evals | **Scoring:** Static checks (primary) + MCP fact-check + LLM judge\n`,
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Total evals | ${totalEvals} |`,
      `| Static pass rate | ${Math.round(overallStaticPassRate * 100)}% |`,
      `| LLM pass rate | ${Math.round(overallLlmPassRate * 100)}% |`,
      `| Overall score | ${aggregate.overallScore}/5 |`,
      "",
      "### Per-Skill Breakdown\n",
      `| Skill | Evals | Static | LLM | Score |`,
      `|-------|-------|--------|-----|-------|`,
      ...skillSummaries.map(
        (s) =>
          `| ${s.skill} | ${s.totalEvals} | ${Math.round(s.staticPassRate * 100)}% | ${Math.round(s.llmPassRate * 100)}% | ${s.score}/5 |`,
      ),
    ].join("\n");

    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: "a" });
  }

  // Eval failures are expected data, not CI failures, so a low score exits 0.
  // A model that returned nothing at all is a different thing: google/gemini-
  // 2.5-pro answered 158 of 158 evals with a 404 ("no longer available to new
  // users"), scored 0, wrote a results file and passed CI. The board excluded
  // it as an incomplete run, so the only sign anything was wrong was a model
  // quietly missing from a chart.
  // emptyResponses counts attempts, and each eval is asked SAMPLES times, so the
  // denominator for both guards below is attempts rather than evals. Comparing
  // the two units printed "169 of 158 evals returned nothing, which is 107% of
  // the suite", and worse than the nonsense percentage, it moved the threshold:
  // at 3 samples a 20% limit measured against the eval count fires at 6.7% of
  // attempts, so a merely noisy run would be failed as broken.
  const totalAttempts = totalEvals * SAMPLES;
  if (totalAttempts > 0 && emptyResponses === totalAttempts) {
    console.error(
      `\nEvery one of the ${totalAttempts} attempts came back empty. That is a broken ` +
      `model or credential, not a score — check the errorMessage above. Failing ` +
      `the run rather than publishing a zero.`,
    );
    process.exit(1);
  }
  // Partial silence is a broken run too, not just total silence.
  //
  // The guard above only fires when every answer is empty, which was the shape of
  // the failures it was written for. gpt-5.5 answered nothing for 35% of the suite
  // and this printed a warning, exited 0, and let the results be committed.
  const EMPTY_LIMIT = 0.2;
  if (emptyResponses > totalAttempts * EMPTY_LIMIT) {
    console.error(
      `\n${emptyResponses} of ${totalAttempts} attempts returned nothing, which is ` +
      `${Math.round((100 * emptyResponses) / totalAttempts)}% of the run. That is a broken run, ` +
      `not a low score. Failing rather than publishing it.`,
    );
    process.exit(1);
  }
  if (WITH_TOOLS) {
    console.log(
      `\nTools were enabled. ${toolCalls} tool call(s) across ${attemptsUsingTools} of ${totalAttempts} attempts.`,
    );
    if (toolCalls === 0) {
      console.warn(
        "The model never opened a file. Progressive disclosure cannot work through an " +
        "ability the model declines to use, so this run is comparable with a no-tools run.",
      );
    }
  }
  if (retriedPrompts > 0) {
    console.warn(
      `\n${retriedPrompts} prompt(s) were asked again after the provider returned nothing. ` +
      `That is throttling, not the model having no answer.`,
    );
  }
  if (emptyResponses > 0) {
    console.warn(
      `\n${emptyResponses} of ${totalAttempts} attempts returned nothing. They are recorded as ` +
      `errors and excluded from the score rather than counted as wrong answers.`,
    );
  }
  process.exit(0);
}

// Only when run as a command. Importing this module to test decideVerdict
// otherwise starts a whole eval run and exits the test process before it begins.
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
