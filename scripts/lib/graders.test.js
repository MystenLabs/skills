#!/usr/bin/env node
/**
 * What the mechanical graders do, and what they refuse to decide.
 *
 * The rule that matters most: a grader that cannot be applied returns no verdict,
 * so the expectation goes to the judge. Recording a failure instead would repeat
 * the mistake the term matcher made -- treating "I could not check this" as "the
 * answer is wrong" -- which is how 266 expectations became unpassable.
 */

import assert from "node:assert/strict";
import {
  applyGrader,
  gradeMechanically,
  expectationText,
  expectationGrader,
  expectationTexts,
} from "./graders.js";

// ── Both expectation shapes ──────────────────────────────────────────────────
assert.equal(expectationText("plain prose"), "plain prose");
assert.equal(expectationGrader({}, "plain prose"), null, "no map entry, no grader");
// Looked up by the expectation's own text, from a map on the eval. `expectations`
// stays an array of strings so the eight other readers of that field are untouched.
{
  const ev = {
    expectations: ["prose", "Uses assert_eq!"],
    graders: { "Uses assert_eq!": { type: "regex", pattern: "assert_eq!" } },
  };
  assert.equal(expectationGrader(ev, "prose"), null);
  assert.deepEqual(expectationGrader(ev, "Uses assert_eq!"), { type: "regex", pattern: "assert_eq!" });
  assert.deepEqual(expectationTexts(ev), ["prose", "Uses assert_eq!"]);
  // Reword the expectation and its grader detaches rather than mis-grading.
  assert.equal(expectationGrader(ev, "Uses assert_eq! for equality"), null,
    "a reworded expectation goes back to the judge");
}

// ── regex ────────────────────────────────────────────────────────────────────
{
  const g = { type: "regex", pattern: "assert_eq!\\s*\\(" };
  assert.equal(applyGrader(g, "assert_eq!(pool.lp_supply(), 100);").pass, true);
  assert.equal(applyGrader(g, "assert!(x == y, 0);").pass, false);
  // Case-insensitive by default, like the rest of this suite's matching.
  assert.equal(applyGrader({ type: "regex", pattern: "ctx\\.sender\\(\\)" }, "CTX.SENDER()").pass, true);
}

// ── absent: the type our expectations need most ──────────────────────────────
{
  const g = { type: "absent", pattern: "public\\s+entry" };
  assert.equal(applyGrader(g, "public fun swap(...)").pass, true, "not present, so it passes");
  assert.equal(applyGrader(g, "public entry fun swap(...)").pass, false);
  assert.match(applyGrader(g, "public entry fun swap()").detail, /forbidden/);
  // The v1 call a modern answer must not reach for.
  assert.equal(applyGrader({ type: "absent", pattern: "tx_context::sender\\(" },
    "let who = ctx.sender();").pass, true);
  assert.equal(applyGrader({ type: "absent", pattern: "tx_context::sender\\(" },
    "let who = tx_context::sender(ctx);").pass, false);
}

// ── regex_all: one expectation naming several things ─────────────────────────
{
  const g = { type: "regex_all", patterns: ["tx\\.set_sender", "tx\\.set_gas_budget", "tx\\.try_build"] };
  assert.equal(applyGrader(g, "tx.set_sender(a); tx.set_gas_budget(b); tx.try_build()?;").pass, true);
  const partial = applyGrader(g, "tx.set_sender(a); tx.try_build()?;");
  assert.equal(partial.pass, false);
  assert.match(partial.detail, /set_gas_budget/, "says which one is missing");
}

// ── exact and any_of ────────────────────────────────────────────────────────
{
  assert.equal(applyGrader({ type: "exact", expect: "onchain" }, "The term is onchain.").pass, true);
  assert.equal(applyGrader({ type: "exact", expect: "onchain" }, "The term is on-chain.").pass, false);
  const g = { type: "any_of", options: [
    { type: "regex", pattern: "0x2::sui::SUI" },
    { type: "regex", pattern: "SUI coin type" },
  ] };
  assert.equal(applyGrader(g, "use the SUI coin type").pass, true);
  assert.equal(applyGrader(g, "nothing relevant here").pass, false);
}

// ── all_of: a requirement and a prohibition in one expectation ──────────────
{
  // "Uses ctx.sender() not tx_context::sender(ctx)". Checking only the first half
  // passes an answer that uses both forms, which is the thing being warned against.
  const g = { type: "all_of", options: [
    { type: "regex", pattern: "ctx\\.sender\\(\\)" },
    { type: "absent", pattern: "tx_context::sender\\(" },
  ] };
  assert.equal(applyGrader(g, "let who = ctx.sender();").pass, true);
  assert.equal(applyGrader(g, "let who = tx_context::sender(ctx);").pass, false, "legacy form only");
  assert.equal(applyGrader(g, "ctx.sender() here and tx_context::sender(ctx) there").pass, false,
    "both forms present is still a failure");
  // One unusable alternative makes the whole thing undecidable rather than failed.
  assert.equal(applyGrader({ type: "all_of", options: [
    { type: "regex", pattern: "ok" }, { type: "regex", pattern: "([" }] }, "ok"), null);
}

// ── numeric: a documented limit, however it is written ──────────────────────
{
  const g = { type: "numeric", value: 1024 };
  assert.equal(applyGrader(g, "a PTB holds up to 1024 commands").pass, true);
  assert.equal(applyGrader(g, "a PTB holds up to 1,024 commands").pass, true, "digit grouping");
  assert.equal(applyGrader(g, "a PTB holds up to 1_024 commands").pass, true);
  assert.equal(applyGrader(g, "a PTB holds up to 400 commands").pass, false);
  assert.equal(applyGrader({ type: "numeric", value: 24, tolerance: 0 }, "an epoch is ~24 hours").pass, true);
}

// ── Anything it cannot run, it does not decide ──────────────────────────────
// This is the important one. Returning a failure here would mean an eval author's
// typo silently reads as a model mistake, forever.
assert.equal(applyGrader({ type: "regex", pattern: "([unclosed" }, "anything"), null,
  "a pattern that does not compile yields no verdict");
assert.equal(applyGrader({ type: "no-such-type", pattern: "x" }, "anything"), null);
assert.equal(applyGrader({ type: "exact" }, "anything"), null, "nothing to compare against");
assert.equal(applyGrader({ type: "regex_all", patterns: [] }, "anything"), null);
assert.equal(applyGrader({ type: "numeric" }, "anything"), null);
assert.equal(applyGrader(null, "anything"), null);
assert.equal(applyGrader({ type: "any_of", options: [{ type: "bogus" }] }, "x"), null,
  "no usable alternative means no verdict, not a failure");

// ── The eval-level pass, mixing graded and ungraded ─────────────────────────
{
  const ev = {
    expectations: [
      "Explains why gRPC is the default",
      "Uses assert_eq!",
      "Does NOT use public entry",
      "broken",
    ],
    graders: {
      "Uses assert_eq!": { type: "regex", pattern: "assert_eq!" },
      "Does NOT use public entry": { type: "absent", pattern: "public\\s+entry" },
      broken: { type: "regex", pattern: "([" },
    },
  };
  const out = gradeMechanically(ev, "assert_eq!(a, b); public fun f() {}");
  assert.equal(out.length, 4);
  assert.equal(out[0].graded, false, "prose goes to the judge");
  assert.equal(out[1].graded, true);
  assert.equal(out[1].pass, true);
  assert.equal(out[2].graded, true);
  assert.equal(out[2].pass, true, "public entry is absent");
  assert.equal(out[3].graded, false, "an unusable grader goes to the judge, not to a failure");
  assert.match(out[1].reason, /^regex:/, "the reason names the grader that decided");
}

console.log("graders: literals are checked, prose is left to the judge, and an unusable grader decides nothing");

// ── Re-interleaving the two sets of verdicts ─────────────────────────────────
// The judge only sees the ungraded expectations, so its reply is shorter and the
// lists have to be woven back together. Off by one here would pin every reason to
// the wrong expectation and look entirely normal.
{
  const { mergeGrades } = await import("./graders.js");
  const mechanical = [
    { expectation: "prose one", graded: false },
    { expectation: "has assert_eq!", graded: true, pass: true, reason: "regex: matched" },
    { expectation: "prose two", graded: false },
    { expectation: "no public entry", graded: true, pass: false, reason: "absent: found forbidden" },
    { expectation: "prose three", graded: false },
  ];
  // What the judge returns for the three it was asked about -- and it has reworded
  // them, which is why its text must not be trusted.
  const judged = [
    { expectation: "Prose one, restated", pass: true, reason: "ok1" },
    { expectation: "prose 2 reworded", pass: false, reason: "ok2" },
    { expectation: "...", pass: true, reason: "ok3" },
  ];
  const out = mergeGrades(mechanical, judged);

  assert.deepEqual(out.map((g) => g.expectation),
    ["prose one", "has assert_eq!", "prose two", "no public entry", "prose three"],
    "order and wording come from the eval, not the judge");
  assert.deepEqual(out.map((g) => g.by), ["judge", "grader", "judge", "grader", "judge"]);
  assert.deepEqual(out.map((g) => g.pass), [true, true, false, false, true],
    "each verdict lands on the expectation it belongs to");
  assert.equal(out[1].reason, "regex: matched");
  assert.equal(out[2].reason, "ok2");

  // A judge that returned less than it was asked is a missing grade, not a pass.
  const short = mergeGrades(mechanical, [{ pass: true, reason: "only one" }]);
  assert.equal(short[0].pass, true);
  assert.equal(short[2].pass, false);
  assert.match(short[2].reason, /no grade returned/);

  // All graded mechanically: the judge is not called at all.
  const allMech = mergeGrades([{ expectation: "a", graded: true, pass: true, reason: "r" }], []);
  assert.deepEqual(allMech, [{ expectation: "a", pass: true, reason: "r", by: "grader" }]);
}

console.log("graders: mechanical and judged verdicts re-interleave onto the right expectations");
