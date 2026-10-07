#!/usr/bin/env -S npx tsx
/**
 * A four-layer comparison is only as good as the thing telling the layers apart.
 *
 * The onboarding runner recorded `judgeModel: "none"` and graded entirely by term
 * matching, and the result was eighteen model reports showing no effect from
 * anything: claude-sonnet-5 read 4.3 / 4.3 / 4.3 / 4.3 across baseline,
 * with-skills, with-skills-mcp and mcp-only, and claude-opus-5 4.3 / 4.2 / 4.3 /
 * 4.3. Read as a finding that is "the skills and the MCP server do nothing". It is
 * the same matcher that made 266 of 896 expectations in the skills matrix
 * unpassable by any correct answer, returning the same number four times.
 *
 * So the judge decides which layer won and what each layer gained. These pin the
 * two ways that can still go wrong.
 */

import assert from "node:assert/strict";
import { computeSummary, type PromptResult, type LayerResult } from "../src/reporters/json-reporter.js";

const LAYERS = ["baseline", "with-skills", "with-skills-mcp", "mcp-only"];

const layer = (judge: number | null, staticScore: number): LayerResult => ({
  response: "x".repeat(400), responseLength: 400,
  passRate: staticScore / 5, passed: 0, total: 0, score: staticScore, checks: [],
  judgePassRate: judge, judgeGraded: judge === null ? 0 : 6, judgeAsked: 6, judgeGrades: [],
  llmScore: judge === null ? 0 : judge * 5, llmReasoning: "",
  codeBlocks: 0, citations: 0, hedges: 0, mcpContextLength: 0,
});

const prompt = (id: string, judges: (number | null)[], statics: number[]): PromptResult => ({
  id, category: "c", prompt: "p",
  layers: Object.fromEntries(LAYERS.map((l, i) => [l, layer(judges[i], statics[i])])),
  bestLayer: null, improvement: {},
} as unknown as PromptResult);

// ── The headline separates layers the matcher could not ────────────────────
{
  // The exact shape the recorded reports have: a term matcher that sees no
  // difference, over a judge that sees a large one.
  const results = [
    prompt("a", [0.30, 0.70, 0.85, 0.45], [4.3, 4.3, 4.3, 4.3]),
    prompt("b", [0.25, 0.65, 0.80, 0.40], [4.3, 4.2, 4.3, 4.3]),
  ];
  const s = computeSummary(results, LAYERS);

  const flat = new Set(LAYERS.map((l) => s.avgScores[l]));
  assert.ok(flat.size <= 2, "the matcher's averages are flat, which is the bug this exists for");

  assert.ok(s.avgJudgePassRates.baseline! < s.avgJudgePassRates["with-skills"]!,
    "the judge must show the skills doing something");
  assert.ok(s.avgJudgePassRates["with-skills-mcp"]! > s.avgJudgePassRates["with-skills"]!,
    "and the MCP server adding to them");
  assert.ok(s.avgJudgePassRates["mcp-only"]! < s.avgJudgePassRates["with-skills"]!,
    "and MCP alone being worth less than the skills alone, on this data");
}

// ── A judge that did not answer is absent, not zero ────────────────────────
{
  // One prompt the judge could not read on the with-skills layer. Averaged in as
  // a zero it would show the skills making the model worse.
  const results = [
    prompt("a", [0.30, 0.80, 0.80, 0.40], [4, 4, 4, 4]),
    prompt("b", [0.30, null, 0.80, 0.40], [4, 4, 4, 4]),
  ];
  const s = computeSummary(results, LAYERS);
  assert.equal(s.avgJudgePassRates["with-skills"], 0.8,
    "the one judged prompt is the average; the unanswered one is not a zero");
  assert.equal(s.judgedCounts["with-skills"], 1, "and the report says how thin that average is");
  assert.equal(s.judgedCounts.baseline, 2);
}

// ── A layer the judge never read reports null, not a number ───────────────
{
  const results = [prompt("a", [null, null, null, null], [4, 4, 4, 4])];
  const s = computeSummary(results, LAYERS);
  for (const l of LAYERS) {
    assert.equal(s.avgJudgePassRates[l], null, `${l} has no judged prompts and must report null`);
    assert.equal(s.judgedCounts[l], 0);
  }
  // The matcher's number still exists, which is the point: it is available and it
  // is not the headline.
  assert.equal(s.avgScores.baseline, 4);
}

// ── A four-way comparison reports how wide its numbers are ────────────────
// 0.43 against 0.44 across four layers invites a reader to pick a winner. Over 29
// prompts those intervals overlap almost entirely, and the report has to say so.
{
  const results = [
    prompt("a", [0.30, 0.44, 0.43, 0.40], [4, 4, 4, 4]),
    prompt("b", [0.32, 0.43, 0.44, 0.41], [4, 4, 4, 4]),
  ];
  const s = computeSummary(results, LAYERS);
  for (const l of LAYERS) {
    const iv = s.judgeIntervals[l];
    assert.ok(iv, `${l} has no interval`);
    assert.ok(iv!.low <= s.avgJudgePassRates[l]! && s.avgJudgePassRates[l]! <= iv!.high,
      `${l}: the point estimate must sit inside its own interval`);
    assert.ok(iv!.low >= 0 && iv!.high <= 1, `${l}: interval out of range`);
  }
  const a = s.judgeIntervals["with-skills"]!;
  const b = s.judgeIntervals["with-skills-mcp"]!;
  assert.ok(a.low < b.high && b.low < a.high,
    "two layers a point apart must have overlapping intervals, which is the whole warning");
}
{
  // A layer the judge never read has no interval rather than a zero-width one.
  const s = computeSummary([prompt("a", [null, null, null, null], [4, 4, 4, 4])], LAYERS);
  for (const l of LAYERS) assert.equal(s.judgeIntervals[l], null);
}

console.log("layers: the judge separates what the term matcher could not, and its silence is never a zero");
console.log("layers: each layer reports an interval, so a one-point gap is not read as a winner");
