#!/usr/bin/env node
/**
 * The README's skill table is the repository, or it is wrong.
 *
 * It had drifted badly and silently. Eight skills were missing -- move-security,
 * onchain-randomness, kiosk, sui-ts-sdk-backend, sui-for-ethereum, zklogin,
 * sui-bridge, sui-networks-gas -- six of them added together in #49 and never
 * listed. A row still pointed at `sui-cli/`, a directory renamed to
 * sui-networks-gas in 48f6bf7, so the only link in the table that was certain to
 * 404 was the one for a skill that still existed under another name. And the
 * install note said "all 26 skills" when there were 31.
 *
 * None of that breaks a build, which is why it survived. A reader comparing the
 * table to the directory listing is the only thing that would have caught it,
 * and that is this file's job now.
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const readme = readFileSync(join(REPO, "README.md"), "utf8");

/** A skill is a root directory with a SKILL.md. The CLI uses the same rule. */
const onDisk = readdirSync(REPO)
  .filter((e) => !e.startsWith(".") && e !== "node_modules")
  .filter((e) => {
    try { return statSync(join(REPO, e)).isDirectory(); } catch { return false; }
  })
  .filter((e) => existsSync(join(REPO, e, "SKILL.md")))
  .sort();

// Rows look like: | [name](name/) | description |
const rows = [...readme.matchAll(/^\|\s*\[([a-z0-9-]+)\]\(([^)]+)\)\s*\|/gm)];
const listed = [...new Set(rows.map((m) => m[1]))].sort();

// ── Every skill is listed, and nothing is listed that is not a skill ────────
const missing = onDisk.filter((s) => !listed.includes(s));
const extra = listed.filter((s) => !onDisk.includes(s));
assert.deepEqual(missing, [],
  `these skills exist and the README does not list them: ${missing.join(", ")}`);
assert.deepEqual(extra, [],
  `the README lists these and they are not skills: ${extra.join(", ")}`);

// ── Every link resolves ─────────────────────────────────────────────────────
// The sui-cli row pointed at a renamed directory for months.
for (const [, name, href] of rows) {
  const target = join(REPO, href.replace(/\/$/, ""));
  assert.ok(existsSync(target), `the ${name} row links to ${href}, which does not exist`);
}

// ── The count in the install note is the real count ─────────────────────────
const count = readme.match(/Installing all (\d+) skills/);
assert.ok(count, 'the install note should say "Installing all N skills"');
assert.equal(Number(count[1]), onDisk.length,
  `the README says ${count[1]} skills and there are ${onDisk.length}`);

console.log(`readme: ${onDisk.length} skills, all listed, all links resolve, count agrees`);
