#!/usr/bin/env -S npx tsx
/**
 * A question the model did not answer is not a question it got wrong.
 *
 * runPrompt can return an empty string without throwing. Nothing raised, so the
 * empty answer was graded: every expectation failed, the eval scored 0, and it sat
 * in the denominator as a question the model got wrong. gpt-5.5 given the skills
 * and retrieval together returned nothing for 55 of 158 questions and published
 * 26.5%, a third of which was silence.
 *
 * Three things had to be true for that to reach the board, and these pin all three.
 */

import assert from "node:assert/strict";
import { decideVerdict } from "../src/run-skills-eval.js";

// ── An unanswered question contributes no grades ──────────────────────────
// The runner throws on an empty response, and the catch returns a result with no
// static and no judge grades. decideVerdict must not read that as a failure.
{
  const v = decideVerdict([], []);
  assert.equal(v.gradedBy, "static", "with nothing graded the verdict falls back");
  assert.equal(v.judgePassRate, 0, "and there is no judge rate to report");
  assert.deepEqual(v.divergence.staticFailJudgePass, []);
  assert.deepEqual(v.divergence.judgeFailStaticPass, []);
}

// ── The shape the old path produced, for contrast ────────────────────────
// An empty answer graded against six expectations fails all six. That is the
// number that entered the score, and it is indistinguishable from a model that
// answered confidently and wrongly.
{
  const expectations = ["a", "b", "c", "d", "e", "f"];
  const asWrongAnswer = decideVerdict(
    expectations.map((e) => ({ expectation: e, passed: false })),
    expectations.map((e) => ({ expectation: e, pass: false, judged: true, reason: "not present" })),
  );
  assert.equal(asWrongAnswer.status, "FAIL");
  assert.equal(asWrongAnswer.judgePassRate, 0,
    "six expectations judged and all failed: this is what silence used to score");
}

// ── The guard thresholds ─────────────────────────────────────────────────
// Stated as the runner applies them, since the runner exits the process and
// cannot be called here.
{
  const RUNNER_LIMIT = 0.2;   // the run fails and is not committed
  const BOARD_LIMIT = 0.05;   // build.js excludes the card from the board
  assert.ok(BOARD_LIMIT < RUNNER_LIMIT,
    "the board is stricter than the runner, so a run that squeaks past still cannot publish");

  const cases: Array<[number, number, boolean, boolean]> = [
    // empty, total, run fails, board excludes
    [158, 158, true, true],    // total silence, the case the old guard caught
    [55, 158, true, true],     // gpt-5.5 with skills and retrieval
    [25, 158, false, true],    // gpt-5.5 with retrieval alone: run survives, board refuses
    [8, 158, false, true],     // just over the board limit
    [1, 158, false, false],    // a single refusal is not a broken run
    [0, 158, false, false],
  ];
  for (const [empty, total, failsRun, excluded] of cases) {
    assert.equal(empty > total * RUNNER_LIMIT, failsRun, `runner verdict wrong for ${empty}/${total}`);
    assert.equal(empty > total * BOARD_LIMIT, excluded, `board verdict wrong for ${empty}/${total}`);
  }
}

console.log("empty: silence is an error, not a wrong answer, and two guards sit between it and the board");

// ── Retry, because the failure was a throttle window ─────────────────────
// gpt-5.5 answered the first 58 questions, degraded over the next 30, failed 42
// consecutively, then recovered for the last 26. Nothing about the questions
// changed. Four of its jobs were running at once against one key.
{
  // The loop as the runner spends it: attempt 0 immediate, then backoff.
  const budget = 3;
  const plan = (responses: string[]) => {
    let used = 0, out = "";
    for (let attempt = 0; attempt < budget; attempt++) {
      used++;
      out = responses[attempt] ?? "";
      if (out.trim()) break;
    }
    return { used, out, retries: used - 1 };
  };

  assert.deepEqual(plan(["an answer"]), { used: 1, out: "an answer", retries: 0 },
    "a first-time answer costs no retry");
  assert.deepEqual(plan(["", "an answer"]), { used: 2, out: "an answer", retries: 1 },
    "one throttled call is recovered by asking again");
  assert.deepEqual(plan(["", "", "an answer"]), { used: 3, out: "an answer", retries: 2 });
  assert.deepEqual(plan(["", "", ""]), { used: 3, out: "", retries: 2 },
    "the budget is finite: three silences is a genuine empty, and only then does it count");
  assert.deepEqual(plan(["", "   ", "answer"]).out, "answer",
    "whitespace is silence too");

  // Backoff grows and is jittered, so workers that hit the wall together do not
  // return together.
  const waits = [1, 2].map((a) => ({ min: 1000 * 2 ** a * 0.5, max: 1000 * 2 ** a * 1.5 }));
  assert.ok(waits[1].min > waits[0].max === false, "ranges may overlap, that is what jitter is for");
  assert.ok(waits[1].min > waits[0].min, "but the floor rises with each attempt");
}

console.log("empty: a silent provider failure is retried before it is believed");
