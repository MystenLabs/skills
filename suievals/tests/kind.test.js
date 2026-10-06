#!/usr/bin/env node
/**
 * The labels have to mean something, and an eval has to be able to overrule them.
 *
 * A derived label is a guess about a prompt. These pin the cases where the guess
 * has a right answer, the precedence between overlapping ones, and the escape
 * hatch -- so a mislabelled eval is fixed in its evals.json rather than by tuning
 * a regular expression until the counts look nice.
 */

import assert from "node:assert/strict";
import { kindOf, KINDS, KIND_IDS } from "../kind.js";

const k = (prompt, extra = {}) => kindOf({ prompt, ...extra });

// ── Each label, on a prompt from the corpus ────────────────────────────────
assert.equal(k("What's the 'storage fund' in Sui? Can I use it to store my application data?"), "explain");
assert.equal(k("How does the risk ratio work in DeepBook Margin? What happens at each threshold?"), "explain");
assert.equal(k("I'm building a wallet UI that needs to show a balance for each coin type."), "design");
assert.equal(k("I need to show a leaderboard of the top 100 users by total trade volume."), "design");
assert.equal(k("Help me set up a standard AMM style smart contract with move."), "build");
assert.equal(k("What are the different types of object ownership on Sui? When should I use a shared object vs an owned object?"), "choose");
assert.equal(k("Review this Move module for security issues: ```move module example::vault {} ```"), "review");

// ── Precedence, where a prompt reads as two things ────────────────────────
// Supplied code plus "what's wrong" is a review, even though it also says "build".
assert.equal(
  k("Here's the code I built. What's wrong with it? ```ts const x = 1; ```"),
  "review",
  "code plus a complaint is a review before it is a build",
);
// Without the code block there is nothing to review, so it is a design question.
assert.equal(
  k("I'm building a thing and something is wrong with my approach"),
  "design",
  "a complaint with no code to look at is not a review",
);
// A comparison that also asks for code is still a comparison: the answer is the
// choice, and the code is how it is illustrated.
assert.equal(
  k("Should I use Table vs Bag? Write an example of the better one."),
  "choose",
  "the decision is the question",
);

// ── An eval overrules the guess ───────────────────────────────────────────
assert.equal(
  k("What's the storage fund?", { kind: "design" }),
  "design",
  "an explicit kind wins, so a bad guess is fixed where the eval lives",
);
assert.equal(
  k("What's the storage fund?", { kind: "nonsense" }),
  "explain",
  "an unknown kind falls back to the guess rather than inventing a label",
);
assert.equal(k("What's the storage fund?", { kind: "  " }), "explain", "and so does an empty one");

// ── Every label the classifier can return is described ────────────────────
for (const id of KIND_IDS) {
  assert.ok(KINDS[id].desc, `${id} has no description for the page to show`);
}
assert.equal(kindOf({}), "explain", "an eval with no prompt does not crash the board");

console.log(`kind: ${KIND_IDS.length} labels, precedence pinned, an eval can overrule the guess`);
