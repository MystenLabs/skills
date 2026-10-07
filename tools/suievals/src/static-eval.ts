/**
 * Static Expectation Checker — adapter over the shared implementation.
 *
 * This file used to carry its own copy of the checker, and that copy is what
 * graded every model in the published skills matrix. It had drifted badly from
 * tools/evals/scripts/lib/static-eval.js:
 *
 *   - It read any capitalised word as a code identifier, so an expectation
 *     beginning "Flags the operational cost of running an indexer" produced the
 *     single term "Flags" and was graded on whether the answer contained that
 *     word. 266 of 896 expectations in the matrix were unpassable this way, and
 *     they held a third of all recorded failures. The shared module had already
 *     been fixed for exactly this; the fix never reached here.
 *   - It never learned that a term a response only ever names in order to warn
 *     against it is not a violation, so answers were penalised for correctly
 *     warning against the deprecated call a negative expectation forbids.
 *
 * So there is no implementation here any more, only the shape its callers
 * expect. Anything about how an expectation is matched belongs in the shared
 * module, where one change reaches every runner.
 */

import {
  evaluateResponse as sharedEvaluate,
  type Evaluation,
} from "./lib/static-eval.js";

export {
  extractKeyTerms,
  proseTerms,
  filterNegativeTerms,
  negativeCandidates,
  onlyMentionedAsWarning,
  checkExpectation,
  passRateToScore,
} from "./lib/static-eval.js";

export interface CheckResult {
  expectation: string;
  passed: boolean;
  isNegative: boolean;
}

export interface EvalResult {
  passRate: number;
  passed: number;
  total: number;
  score: number;
  checks: Array<{ expectation: string; passed: boolean }>;
}

/**
 * Evaluate a response against all expectations.
 *
 * Delegates to the shared checker and renames `results` to `checks`, which is
 * the key the runners in this package read.
 */
export function evaluateResponse(
  response: string,
  expectations: string[],
): EvalResult {
  const evaluation: Evaluation = sharedEvaluate(response, expectations);
  return {
    passRate: evaluation.passRate,
    passed: evaluation.passed,
    total: evaluation.total,
    score: evaluation.score,
    checks: evaluation.results.map((r) => ({
      expectation: r.expectation,
      passed: r.passed,
    })),
  };
}

// ── Response analysis helpers ────────────────────────────────────────

export function countCodeBlocks(text: string): number {
  return (text.match(/```/g) || []).length / 2;
}

export function countCitations(text: string): number {
  return (text.match(/\[source:/gi) || []).length;
}

const HEDGE_PATTERNS = [
  /\bI'm not (?:entirely )?sure\b/i,
  /\bI (?:don't|do not) have (?:specific|exact|up-to-date)\b/i,
  /\bmight (?:not )?be\b/i,
  /\bI (?:can't|cannot) (?:verify|confirm)\b/i,
  /\bmy (?:knowledge|training|information) (?:cutoff|may be)\b/i,
  /\bplease (?:check|verify|refer to)\b/i,
  /\bas of my (?:last|knowledge)\b/i,
  /\bI recommend (?:checking|verifying)\b/i,
  /\bI believe\b/i,
  /\bI think\b/i,
];

export function countHedges(text: string): number {
  return HEDGE_PATTERNS.filter((p) => p.test(text)).length;
}
