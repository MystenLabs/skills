/**
 * JSON Reporter
 *
 * Writes structured JSON reports in the same schema used by the existing
 * eval dashboard. Reports are written to tools/evals/reports/ so the
 * dashboard picks them up without changes.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, resolve, dirname } from "path";

// ── Types ────────────────────────────────────────────────────────────

import { wilson } from "../stats.js";

export interface LayerResult {
  response: string;
  responseLength: number;
  passRate: number;
  passed: number;
  total: number;
  score: number;
  checks: Array<{ expectation: string; passed: boolean }>;
  /**
   * The reader's verdict on this layer.
   *
   * null means the judge did not answer -- a timeout, a bad key, unparseable
   * output -- and must not be read as a score of zero. The runner recorded no
   * judge at all until now, which is why its four-layer comparison was flat.
   */
  judgePassRate?: number | null;
  judgeGraded?: number;
  judgeAsked?: number;
  judgeGrades?: Array<{ expectation: string; pass: boolean; judged: boolean; reason: string }>;
  llmScore: number;
  llmReasoning: string;
  codeBlocks: number;
  citations: number;
  hedges: number;
  mcpContextLength: number;
  error?: string;
}

export interface PromptResult {
  id: string;
  category: string;
  prompt: string;
  /** BCP-47-ish tag; absent means English. A quarter of docs traffic is not. */
  language?: string;
  layers: Record<string, LayerResult>;
  bestLayer: string | null;
  improvementFromBaseline: Record<string, string>;
}

export interface ReportSummary {
  avgScores: Record<string, number | null>;
  avgPassRates: Record<string, number | null>;
  avgLlmScores: Record<string, number | null>;
  /** The share of expectations a reader accepted, per layer. The headline. */
  avgJudgePassRates: Record<string, number | null>;
  /** How many prompts the judge actually answered for, per layer. */
  judgedCounts: Record<string, number>;
  /**
   * Wilson bounds on each layer's judged rate.
   *
   * A four-way comparison invites reading 0.43 against 0.44 as a difference. Over
   * 29 prompts those intervals overlap almost entirely, and the report should say
   * so rather than leave the reader to assume otherwise.
   */
  judgeIntervals: Record<string, { low: number; high: number; n: number } | null>;
  bestLayerCounts: Record<string, number>;
  biggestImprovements: Array<{
    id: string;
    category: string;
    baselinePassRate: number;
    baselineScore: number;
    bestLayer: string | null;
    bestPassRate: number;
    bestScore: number;
    improvement: number;
  }>;
}

export interface EvalReport {
  timestamp: string;
  model: string;
  provider: string;
  runner: string;
  judgeModel: string;
  scoring: string;
  layers: string[];
  prompts: PromptResult[];
  summary: ReportSummary;
}

// ── Report directory ─────────────────────────────────────────────────

const PI_EVALS_DIR = resolve(dirname(new URL(import.meta.url).pathname), "../..");
// Same reason as run-skills-eval: the sibling `evals` directory was a fact about
// the repository this came from, not about this runner.
const REPORTS_DIR = resolve(
  process.env.REPORTS_DIR ?? resolve(PI_EVALS_DIR, "../evals/reports"),
);

// ── Summary computation ──────────────────────────────────────────────

export function computeSummary(
  results: PromptResult[],
  allLayers: string[],
): ReportSummary {
  const avgScores: Record<string, number | null> = {};
  const avgPassRates: Record<string, number | null> = {};
  const avgLlmScores: Record<string, number | null> = {};
  const avgJudgePassRates: Record<string, number | null> = {};
  const judgedCounts: Record<string, number> = {};
  const judgeIntervals: Record<string, { low: number; high: number; n: number } | null> = {};
  const bestLayerCounts: Record<string, number> = {};

  for (const layer of allLayers) {
    bestLayerCounts[layer] = 0;
  }

  for (const layer of allLayers) {
    const layerResults = results.filter(
      (r) => r.layers[layer] && !r.layers[layer].error,
    );
    const scores = layerResults.map((r) => r.layers[layer].score);
    const passRates = layerResults.map((r) => r.layers[layer].passRate);
    const llmScores = layerResults.map((r) => r.layers[layer].llmScore);

    avgScores[layer] =
      scores.length > 0
        ? Math.round(
            (scores.reduce((a, b) => a + b, 0) / scores.length) * 100,
          ) / 100
        : null;
    avgPassRates[layer] =
      passRates.length > 0
        ? Math.round(
            (passRates.reduce((a, b) => a + b, 0) / passRates.length) * 1000,
          ) / 1000
        : null;
    avgLlmScores[layer] =
      llmScores.length > 0
        ? Math.round(
            (llmScores.reduce((a, b) => a + b, 0) / llmScores.length) * 100,
          ) / 100
        : null;

    // The headline this report is read by. avgScores is the term matcher's, and
    // the term matcher returned the same number for all four layers -- 4.3 across
    // the board for claude-sonnet-5 -- which reads as "the skills and the MCP
    // server change nothing" and is actually "this grader cannot tell". Only
    // layers the judge actually answered for are averaged; a layer it could not
    // read is null rather than zero.
    const judged = layerResults
      .map((r) => r.layers[layer].judgePassRate)
      .filter((v): v is number => typeof v === "number");
    avgJudgePassRates[layer] =
      judged.length > 0
        ? Math.round((judged.reduce((a, b) => a + b, 0) / judged.length) * 1000) / 1000
        : null;
    judgedCounts[layer] = judged.length;
    if (judged.length > 0) {
      // Expectation-level denominator: each prompt contributes its own count, and
      // the rate is over all of them rather than over the prompts.
      const totals = layerResults
        .map((r) => r.layers[layer])
        .filter((l) => typeof l.judgeGraded === "number" && l.judgeGraded > 0);
      const n = totals.reduce((a, l) => a + (l.judgeGraded ?? 0), 0);
      const hits = totals.reduce((a, l) => a + Math.round((l.judgePassRate ?? 0) * (l.judgeGraded ?? 0)), 0);
      const w = wilson(hits, n);
      judgeIntervals[layer] = { low: Math.round(w.low * 1000) / 1000, high: Math.round(w.high * 1000) / 1000, n };
    } else {
      judgeIntervals[layer] = null;
    }
  }

  for (const r of results) {
    if (r.bestLayer) {
      bestLayerCounts[r.bestLayer] = (bestLayerCounts[r.bestLayer] ?? 0) + 1;
    }
  }

  // Find biggest improvements from baseline
  const biggestImprovements = results
    .filter((r) => r.layers.baseline && !r.layers.baseline.error)
    .map((r) => {
      const basePassRate = r.layers.baseline.passRate;
      let bestNonBaseline = { layer: null as string | null, passRate: 0, score: 0 };
      for (const layer of ["with-skills", "with-skills-mcp", "mcp-only"]) {
        if (
          r.layers[layer] &&
          !r.layers[layer].error &&
          r.layers[layer].passRate > bestNonBaseline.passRate
        ) {
          bestNonBaseline = {
            layer,
            passRate: r.layers[layer].passRate,
            score: r.layers[layer].score,
          };
        }
      }
      return {
        id: r.id,
        category: r.category,
        baselinePassRate: basePassRate,
        baselineScore: r.layers.baseline.score,
        bestLayer: bestNonBaseline.layer,
        bestPassRate: bestNonBaseline.passRate,
        bestScore: bestNonBaseline.score,
        improvement: Math.round(
          (bestNonBaseline.passRate - basePassRate) * 100,
        ),
      };
    })
    .filter((r) => r.improvement > 0)
    .sort((a, b) => b.improvement - a.improvement)
    .slice(0, 10);

  return {
    avgScores,
    avgPassRates,
    avgLlmScores,
    avgJudgePassRates,
    judgedCounts,
    judgeIntervals,
    bestLayerCounts,
    biggestImprovements,
  };
}

// ── Report writing ───────────────────────────────────────────────────

/**
 * Write the eval report to disk in the dashboard-compatible format.
 *
 * @param report - The full report object
 * @param label  - Optional label suffix for the filename (e.g., "sonnet", "haiku")
 * @returns The absolute path of the written file
 */
export function writeReport(report: EvalReport, label?: string): string {
  mkdirSync(REPORTS_DIR, { recursive: true });

  const filename = label
    ? `onboarding-eval-results-${label}.json`
    : "onboarding-eval-results.json";

  const outPath = join(REPORTS_DIR, filename);
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  return outPath;
}

// ── Console summary ──────────────────────────────────────────────────

export function printSummary(
  results: PromptResult[],
  summary: ReportSummary,
  allLayers: string[],
  meta: { model: string; promptCount: number },
): void {
  console.log(`\n${"=".repeat(70)}`);
  console.log(
    `ONBOARDING EVAL RESULTS (Pi): ${meta.promptCount} prompts x ${allLayers.length} layers`,
  );
  console.log(`${"=".repeat(70)}`);

  console.log(`\nScores by layer (static pass rate / score / LLM judge):`);
  for (const layer of allLayers) {
    if (summary.avgPassRates[layer] !== null) {
      console.log(
        `  ${layer.padEnd(20)} pass=${Math.round(summary.avgPassRates[layer]! * 100)}%  score=${summary.avgScores[layer]!.toFixed(2)}  llm=${summary.avgLlmScores[layer]!.toFixed(2)}`,
      );
    }
  }

  console.log(`\nBest layer distribution (by static score):`);
  for (const [layer, count] of Object.entries(summary.bestLayerCounts)) {
    if (count > 0) {
      console.log(`  ${layer.padEnd(20)} ${count} prompts`);
    }
  }

  if (summary.biggestImprovements.length > 0) {
    console.log(`\nBiggest improvements over baseline (by pass rate):`);
    for (const imp of summary.biggestImprovements.slice(0, 5)) {
      console.log(
        `  ${imp.id}: +${imp.improvement}% (${imp.bestLayer}, ${Math.round(imp.baselinePassRate * 100)}% -> ${Math.round(imp.bestPassRate * 100)}%)`,
      );
    }
  }

  // Per-category breakdown
  const categories = [...new Set(results.map((r) => r.category))];
  for (const cat of categories) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`${cat}`);
    for (const r of results.filter((r) => r.category === cat)) {
      const scores = allLayers
        .map((l) => {
          const ld = r.layers[l];
          if (!ld || ld.error) return `${l}=ERR`;
          return `${l}=${ld.passed}/${ld.total}(${Math.round(ld.passRate * 100)}%)`;
        })
        .join("  ");
      const best = r.bestLayer ? ` -> ${r.bestLayer}` : "";
      console.log(`  ${r.id}: ${scores}${best}`);
    }
  }

  console.log(`\n${"=".repeat(70)}\n`);
}

// ── GitHub Actions summary ───────────────────────────────────────────

export function writeGitHubSummary(
  summary: ReportSummary,
  allLayers: string[],
  meta: { model: string; provider: string },
): void {
  if (!process.env.GITHUB_STEP_SUMMARY) return;

  const lines = [
    `## Onboarding Eval Results - Pi (${meta.provider} / ${meta.model})\n`,
    `**Runner:** pi-evals | **Scoring:** static expectation checks (primary)\n`,
    `| Layer | Avg Pass Rate | Avg Score | Avg LLM | Best For |`,
    `|-------|---------------|-----------|---------|----------|`,
  ];

  for (const layer of allLayers) {
    const passRate =
      summary.avgPassRates[layer] !== null
        ? `${Math.round(summary.avgPassRates[layer]! * 100)}%`
        : "N/A";
    const score =
      summary.avgScores[layer] !== null
        ? summary.avgScores[layer]!.toFixed(2)
        : "N/A";
    const llm =
      summary.avgLlmScores[layer] !== null
        ? summary.avgLlmScores[layer]!.toFixed(2)
        : "N/A";
    const count = summary.bestLayerCounts[layer] ?? 0;
    lines.push(
      `| ${layer} | ${passRate} | ${score} | ${llm} | ${count} prompts |`,
    );
  }

  if (summary.biggestImprovements.length > 0) {
    lines.push("");
    lines.push(
      `**Biggest improvements:** ${summary.biggestImprovements
        .slice(0, 3)
        .map((i) => `${i.id} (+${i.improvement}%)`)
        .join(", ")}`,
    );
  }

  writeFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n"), {
    flag: "a",
  });
}
