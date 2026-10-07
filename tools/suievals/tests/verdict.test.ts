#!/usr/bin/env -S npx tsx
/**
 * Who decides an eval, and what happens when the judge cannot answer.
 *
 * The skills matrix graded every expectation by term matching, and the judge --
 * same prompt and same model as the one the skills repo grades with -- was
 * disabled by a flag and ignored by the verdict even when it ran. That is how 266
 * of 896 expectations came to be unpassable by any correct answer: "Flags the
 * operational cost of running an indexer" reduced to the single term "Flags", and
 * with static as the only voice there was nothing to contradict it.
 *
 * So the judge decides now, and these pin the two things that must not go wrong:
 * a judge that could not answer is never read as a failure, and the disagreement
 * between the graders is counted rather than discarded.
 */

import assert from "node:assert/strict";
import { decideVerdict } from "../src/run-skills-eval.js";

const judgedPass = (e: string) => ({ expectation: e, pass: true, judged: true, reason: "ok" });
const judgedFail = (e: string) => ({ expectation: e, pass: false, judged: true, reason: "missing" });
/** What the judge returns on a timeout, a bad key, or unparseable output. */
const notJudged = (e: string) => ({ expectation: e, pass: false, judged: false, reason: "Judge error: timeout" });

const stat = (e: string, passed: boolean) => ({ expectation: e, passed });

// ── The judge decides when it graded everything ──────────────────────────────
{
  const v = decideVerdict(
    [stat("a", false), stat("b", false)],
    [judgedPass("a"), judgedPass("b")],
  );
  assert.equal(v.gradedBy, "judge");
  assert.equal(v.status, "PASS", "term matching failed both; the judge read the answer and passed it");
  assert.equal(v.judgePassRate, 1);
}
{
  const v = decideVerdict([stat("a", true)], [judgedFail("a")]);
  assert.equal(v.status, "FAIL", "a term appearing is not the expectation being satisfied");
  assert.equal(v.gradedBy, "judge");
}

// ── A judge that could not answer is not a judge that failed the answer ──────
// This is the one that matters. The judge's catch block returns pass:false for
// every expectation; read as a verdict, a single timeout would mark a whole eval
// FAIL and the board would show a regression that never happened.
{
  const v = decideVerdict(
    [stat("a", true), stat("b", true)],
    [notJudged("a"), notJudged("b")],
  );
  assert.equal(v.gradedBy, "static", "with nothing judged the verdict is term matching's");
  assert.equal(v.status, "PASS", "and term matching passed both, so the eval passes");
  assert.equal(v.judgePassRate, 0, "no judged expectations means no judge rate to report");
}
{
  // Partial grading is not enough to decide: the ungraded expectations are
  // unknown, not satisfied.
  const v = decideVerdict(
    [stat("a", true), stat("b", true)],
    [judgedPass("a"), notJudged("b")],
  );
  assert.equal(v.gradedBy, "static", "a partial judge result does not decide");
  assert.equal(v.status, "PASS");
}
{
  // And the fallback is a real verdict, not an automatic pass.
  const v = decideVerdict([stat("a", true), stat("b", false)], [notJudged("a"), notJudged("b")]);
  assert.equal(v.gradedBy, "static");
  assert.equal(v.status, "FAIL");
}
{
  const v = decideVerdict([stat("a", true)], []);
  assert.equal(v.gradedBy, "static", "no judge grades at all falls back");
}

// ── Disagreement is counted, because it is the alarm ─────────────────────────
{
  const v = decideVerdict(
    [stat("verb-only", false), stat("coincidence", true), stat("agreed", true)],
    [judgedPass("verb-only"), judgedFail("coincidence"), judgedPass("agreed")],
  );
  assert.deepEqual(v.divergence.staticFailJudgePass, ["verb-only"],
    "the matcher failed an answer the judge accepted -- the shape of the grader bug");
  assert.deepEqual(v.divergence.judgeFailStaticPass, ["coincidence"],
    "the matcher passed on a word the judge did not accept");
  assert.equal(v.status, "FAIL", "the judge decides, and it failed one");
}
{
  // Nothing ungraded may be counted as a disagreement.
  const v = decideVerdict([stat("a", true)], [notJudged("a")]);
  assert.deepEqual(v.divergence.staticFailJudgePass, []);
  assert.deepEqual(v.divergence.judgeFailStaticPass, []);
}

// ── The rate is over what was graded, not over what was asked ───────────────
{
  const v = decideVerdict(
    [stat("a", false), stat("b", false), stat("c", false)],
    [judgedPass("a"), judgedPass("b"), judgedFail("c")],
  );
  assert.equal(Math.round(v.judgePassRate * 100), 67);
}

console.log("verdict: judge decides, an unanswered judge never counts as a failure, disagreement is counted");
