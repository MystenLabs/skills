#!/usr/bin/env -S npx tsx
/**
 * Level 3 loads when level 2 asks for it, and not before.
 *
 * The Agent Skills standard is tiered: SKILL.md is level 2 and loads on selection,
 * everything beside it is level 3 and loads only when SKILL.md tells the agent to
 * go and read it. This runner concatenated the whole directory, and 22 of 43 skills
 * ship extra files, so for half the library the model got material a production
 * agent would have had to fetch. These pin which files that rule lets through.
 */

import assert from "node:assert/strict";
import { referencedFiles } from "../src/run-skills-eval.js";

const files = ["api-reference.md", "examples.md", "migration.md", "deep-dive.md"];

// A skill that points at a file gets that file.
assert.deepEqual(
  referencedFiles("See [the API reference](api-reference.md) for the full list.", files),
  ["api-reference.md"],
  "a markdown link is the skill asking for the file",
);
assert.deepEqual(
  referencedFiles("Full signatures are in `examples.md`.", files),
  ["examples.md"],
  "a backticked filename counts",
);
assert.deepEqual(
  referencedFiles("Read migration.md before upgrading.", files),
  ["migration.md"],
  "and so does the bare name in prose",
);
assert.deepEqual(
  referencedFiles("See api-reference.md and examples.md.", files).sort(),
  ["api-reference.md", "examples.md"],
  "several at once",
);

// A skill that points at nothing gets nothing, which is the case that was costing
// us: half the library ships files no SKILL.md mentions.
assert.deepEqual(
  referencedFiles("Objects on Sui have a unique ID.", files),
  [],
  "material the skill never refers to stays unloaded",
);
assert.deepEqual(referencedFiles("", files), [], "an empty skill asks for nothing");
assert.deepEqual(referencedFiles("see api-reference.md", []), [], "nothing available, nothing loaded");

// Near misses must not count, or the rule lets everything through again.
assert.deepEqual(
  referencedFiles("This supersedes the old examples.markdown file.", files),
  [],
  "a longer filename that merely starts the same is not a match",
);
assert.deepEqual(
  referencedFiles("Our deep-dive.md.bak is stale.", ["deep-dive.md"]),
  [],
  "nor is a different file that contains this one's name",
);
assert.deepEqual(
  referencedFiles("xapi-reference.md", files),
  [],
  "nor a name glued to a preceding word",
);

// Punctuation around a real mention must not block it.
for (const text of [
  "(see examples.md)",
  "examples.md, which lists them",
  "read examples.md.",
  "in /skills/x/examples.md",
  '"examples.md"',
]) {
  assert.deepEqual(referencedFiles(text, files), ["examples.md"], `failed on: ${text}`);
}

console.log("disclosure: a reference file loads when SKILL.md points at it, and not otherwise");
