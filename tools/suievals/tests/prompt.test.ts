#!/usr/bin/env -S npx tsx
/**
 * The baseline prompt must not name a reference it cannot show.
 *
 * The system prompt was one template with the skill text interpolated into it, and
 * the no-skills mode only emptied the interpolation. The sentence around it stayed,
 * so a baseline run asked a model to "use the following skill reference" and then
 * showed it nothing. A model that answers "I don't see the reference you mentioned"
 * scores zero, and the delta the public page attributes to the documentation would
 * include the delta between a working prompt and a broken one -- in the direction
 * that flatters the library.
 */

import assert from "node:assert/strict";
import { buildSystemPrompt } from "../src/run-skills-eval.js";

const BASE = "You are an expert Sui blockchain developer assistant.";

for (const empty of ["", "   ", "\n\n", "\t"]) {
  const p = buildSystemPrompt(empty);
  assert.equal(p, BASE, `empty context must drop the clause, got ${JSON.stringify(p)}`);
  assert.ok(!/following skill reference/.test(p), "no reference is promised");
  assert.ok(!/\n\n$/.test(p), "and no dangling separator is left behind");
}

const withSkill = buildSystemPrompt("# sui-objects -- SKILL.md\n\nObjects are owned.");
assert.ok(withSkill.startsWith(BASE), "the role is unchanged");
assert.ok(/following skill reference/.test(withSkill), "a real context keeps the clause");
assert.ok(withSkill.includes("Objects are owned."), "and carries the skill text");

// ── Retrieved passages are named as retrieval, not as more skill ───────────
// A model told "here is the skill" over a passage pulled for this one question
// will cite it as settled guidance, and the mcp-only layer would then be
// measuring a curated skill that does not exist.
{
  const mcpOnly = buildSystemPrompt("", "[1] https://docs.sui.io/x\nShared objects go through consensus.");
  assert.ok(mcpOnly.startsWith(BASE));
  assert.ok(!/following skill reference/.test(mcpOnly), "there is no skill on this layer");
  assert.ok(/retrieved from the Sui documentation/.test(mcpOnly), "the passages are labelled as search results");
  assert.ok(/not a curated guide/.test(mcpOnly));
  assert.ok(mcpOnly.includes("Shared objects go through consensus."));
}
{
  const both = buildSystemPrompt("# ptbs -- SKILL.md\n\nA PTB takes 1024 commands.", "[1] docs\nSponsored transactions exist.");
  assert.ok(/following skill reference/.test(both), "the skill clause survives");
  assert.ok(/retrieved from the Sui documentation/.test(both), "and so does the retrieval clause");
  assert.ok(both.indexOf("1024 commands") < both.indexOf("Sponsored transactions"),
    "the skill comes first, so retrieval reads as supplementary to it");
}
{
  // An empty search result must not leave a header promising passages. A
  // with-skills-mcp run whose searches all came back empty is a with-skills run,
  // and it should look exactly like one.
  const empty = buildSystemPrompt("# ptbs -- SKILL.md\n\nA PTB takes 1024 commands.", "   ");
  assert.equal(empty, buildSystemPrompt("# ptbs -- SKILL.md\n\nA PTB takes 1024 commands."),
    "an empty retrieval is indistinguishable from no retrieval");
}

console.log("prompt: a baseline prompt names no reference it cannot show");
