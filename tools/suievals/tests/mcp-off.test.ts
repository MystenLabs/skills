#!/usr/bin/env -S npx tsx
/**
 * Retrieval is off, and being off is what is tested here.
 *
 * A per-process cap was the previous answer and it did not hold twice: the plan
 * was passed on 3 October ($15,000 of overage) and again on 5 October with the
 * cap in place. Two reasons, and this suite exists because of the second one.
 *
 *   The cap divided a monthly allowance by a job count nobody bounded.
 *   pi-eval-run crosses models with layers, so one dispatch is up to 68 jobs; at
 *   60 searches each that is 4,080 against a 3,000/month plan, and every
 *   individual workflow still looked prudent.
 *
 *   The cap was not where the calls were. mcp-verify.ts claimed every MCP call
 *   in the repository passed through it. Four modules did; three did not --
 *   scan-snippets.js (its own https.request, run by docs-checks across seven
 *   sites), tools/correspondence/verify.py (its own urllib request, run by
 *   docs-review across five) and tools/evals/scripts/lib/kapa-mcp.js.
 *
 * So the control is a switch that defaults to off, which no amount of job
 * multiplication can defeat, and these pin it. A default that only holds until
 * someone sets an unrelated variable is not a default.
 */

import assert from "node:assert/strict";

// Deliberately no MCP_ENABLED. A credential is present, which is the point:
// having the key must not be the same as being allowed to spend it.
delete process.env.MCP_ENABLED;
process.env.KAPA_MCP_API_KEY = "test-key-not-a-real-credential";
process.env.MCP_MAX_CALLS = "500";

let requests = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (async () => {
  requests += 1;
  return new Response("{}", { status: 200 });
}) as typeof fetch;

const { mcpSearch, mcpCallCount, mcpAvailable } = await import("../src/mcp-verify.js");

// ── Nothing is sent, with a key in hand and budget to spare ────────────────
for (let i = 0; i < 25; i++) await mcpSearch(`a query long enough to pass any length guard ${i}`);
assert.equal(requests, 0, `retrieval is off, so no request may be sent; sent ${requests}`);
assert.equal(mcpCallCount(), 0, "and nothing is counted as spent");

// ── An off switch degrades, it does not throw ───────────────────────────────
// Every caller already treats [] as "the server had nothing", so turning
// retrieval off costs a run its retrieval rather than failing it.
assert.deepEqual(await mcpSearch("a query long enough to pass any length guard"), [],
  "an off switch returns no chunks rather than raising");

// ── Callers can tell "off" from "the server had nothing" ───────────────────
// This is the distinction that matters for the fact checkers: an empty result
// read as a passed check is how months of verification reported success against
// an empty context. mcpAvailable() is how they report "unchecked" instead.
assert.equal(mcpAvailable(), false,
  "with retrieval off, a caller must be able to see that no check is possible");

globalThis.fetch = realFetch;
console.log("mcp-off: a key is not a licence to spend, and off is distinguishable from empty");
