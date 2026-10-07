#!/usr/bin/env -S npx tsx
/**
 * The request the docs server actually answers.
 *
 * Five copies of this call existed and three posted {query, top_k} to
 * `${host}/search`. That path does not exist -- the server speaks JSON-RPC at
 * its root -- and the two fail differently without a key at all:
 *
 *   POST https://sui-docs-dashboard.mcp.kapa.ai/        403 invalid_token
 *   POST https://sui-docs-dashboard.mcp.kapa.ai/search  404 Not Found
 *
 * Every one of those calls 404'd and returned "", and every caller reads ""
 * as "the docs had nothing to say", so months of fact checks ran against an
 * empty context and reported themselves as passing.
 *
 * This asserts the wire format against a stubbed transport, because the bug
 * was invisible at every level above it: the code ran, returned a value, and
 * the value was indistinguishable from a real empty result.
 */

import assert from "node:assert/strict";

// Set before the module loads, and imported dynamically for that reason:
// MCP_ENABLED is read once at module scope, so a static import would evaluate
// mcp-verify with retrieval off and this suite would stub a call never made.
process.env.MCP_ENABLED = "1";
process.env.KAPA_MCP_API_KEY = "test-key-not-a-real-credential";

const realFetch = globalThis.fetch;
let seen: { url: string; init: RequestInit } | null = null;

globalThis.fetch = (async (url: string | URL, init: RequestInit) => {
  seen = { url: String(url), init };
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: "1",
      result: { content: [{ type: "text", text: JSON.stringify({ results: [{ source_url: "https://docs.sui.io/x", content: "Move.toml needs edition = \"2024\"." }] }) }] },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}) as typeof fetch;

const { mcpSearch, MCP_URL, MCP_TOOL } = await import("../src/mcp-verify.js");
const chunks = await mcpSearch("what edition does Move.toml need");
globalThis.fetch = realFetch;

assert.ok(seen, "mcpSearch made no request");
const { url, init } = seen!;

// The root, never /search.
assert.equal(url, MCP_URL, `posted to ${url}`);
assert.ok(!url.includes("/search"), "/search is a 404 on this server");
assert.equal(init.method, "POST");

// JSON-RPC, not a REST body.
const body = JSON.parse(String(init.body));
assert.equal(body.jsonrpc, "2.0", "the server speaks JSON-RPC");
assert.equal(body.method, "tools/call");
assert.equal(body.params.name, MCP_TOOL);
assert.equal(body.params.arguments.query, "what edition does Move.toml need");
assert.ok(!("top_k" in body), "top_k at the top level is the REST shape");

// The streamable transport refuses a request that will not accept an event stream.
const headers = init.headers as Record<string, string>;
assert.match(headers.Accept ?? "", /text\/event-stream/, "Accept must allow an event stream");
assert.match(headers.Authorization ?? "", /^Bearer /);

// And the envelope is unwrapped to usable chunks.
assert.equal(chunks.length, 1);
assert.match(chunks[0].content, /edition = "2024"/);
assert.equal(chunks[0].source_url, "https://docs.sui.io/x");

// No caller may reintroduce the dead path.
const { readFileSync, readdirSync } = await import("node:fs");
const { join, dirname, resolve } = await import("node:path");
const SRC = resolve(dirname(new URL(import.meta.url).pathname), "../src");
const walk = (d: string): string[] =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith(".ts") ? [join(d, e.name)] : []);
for (const f of walk(SRC)) {
  const t = readFileSync(f, "utf-8");
  const offending = t.split("\n").filter((l) => /kapa[^\n]*\/search|\/search`/.test(l) && !l.trimStart().startsWith("*") && !l.trimStart().startsWith("//"));
  assert.equal(offending.length, 0, `${f} calls the dead /search path: ${offending[0]}`);
}

console.log("ok  kapa request shape: JSON-RPC at the root, event-stream accepted, no /search");
