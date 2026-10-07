#!/usr/bin/env -S npx tsx
/**
 * The MCP budget has to hold, because the last time it did not it cost $15,000.
 *
 * The plan allows 3,000 searches a month. On 3 October the pipeline made over
 * 30,000 in a day. No single caller was responsible: the per-expectation
 * verification, the eval layers, the oracle and the code reviewer each looked
 * reasonable alone and ran in the same window.
 *
 * That is why the cap is inside mcpSearch rather than in each caller. A limit a
 * new call site can forget to apply is not a limit, and these pin the two things
 * that must stay true: the cap counts every search whoever makes it, and a
 * search attempted past it returns no chunks without sending a request, so it
 * adds nothing to the bill. It returns rather than throws because every caller
 * already treats an empty result as "the server had nothing", and a run that
 * loses some retrieval is worth far less than an unbounded invoice.
 */

import assert from "node:assert/strict";

// The switch has to be set before the module is imported: MCP_ENABLED is read
// once at module scope, which is what makes it un-sneak-past-able at runtime.
process.env.MCP_ENABLED = "1";
process.env.KAPA_MCP_API_KEY = "test-key";
process.env.MCP_MAX_CALLS = "3";

let requests = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (async () => {
  requests += 1;
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      result: { content: [{ type: "text", text: JSON.stringify({ chunks: [] }) }] },
    }),
  } as unknown as Response;
}) as typeof fetch;

const { mcpSearch, mcpCallCount } = await import("../src/mcp-verify.js");

// ── The budget is spent, then nothing more is billed ────────────────────────
for (let i = 0; i < 10; i++) await mcpSearch(`query ${i}`);

assert.equal(requests, 3,
  `ten searches against a budget of three must make three requests, made ${requests}`);
assert.equal(mcpCallCount(), 3, "and the counter reports what was spent");

// ── Over budget degrades, it does not throw ────────────────────────────────
const after = await mcpSearch("one more");
assert.deepEqual(after, [],
  "a search attempted past the budget returns no chunks, which every caller already handles");
assert.equal(requests, 3, "and sends no further request, so the attempt is not billed");

// ── A missing key short-circuits before the budget is touched ──────────────
// Otherwise a run without credentials would burn the allowance on requests that
// cannot succeed.
delete process.env.KAPA_MCP_API_KEY;
const spentBefore = mcpCallCount();
assert.deepEqual(await mcpSearch("no key"), []);
assert.equal(mcpCallCount(), spentBefore, "no key means no spend");

globalThis.fetch = realFetch;
console.log("mcp-budget: the cap counts every search, and a search past it sends no request");

// ── The analytics key is not an MCP credential ─────────────────────────────
// KAPA_API_KEY_SUI used to be a fallback for the MCP key. It is passed by
// docs-review, weekly-analytics, agent-adoption and six pi-* workflows to read
// question data from api.kapa.ai, so accepting it here meant all of those jobs
// silently held the ability to spend the search plan.
process.env.KAPA_API_KEY_SUI = "analytics-key";
const spentBeforeAnalytics = mcpCallCount();
assert.deepEqual(await mcpSearch("analytics key is not a search licence"), []);
assert.equal(mcpCallCount(), spentBeforeAnalytics,
  "the analytics key must not authorise a search");
delete process.env.KAPA_API_KEY_SUI;

globalThis.fetch = realFetch;
console.log("mcp-budget: the cap counts every search, and no key and no switch both mean no spend");
