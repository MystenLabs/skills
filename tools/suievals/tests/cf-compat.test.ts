#!/usr/bin/env -S npx tsx
/**
 * The two fields Workers AI rejected, and nothing else.
 *
 * Cloudflare's /compat endpoint validates messages[].content as a string. pi
 * sends OpenAI content-parts arrays, and null content on an assistant message
 * carrying tool_calls. Both are legal OpenAI; both return 400, and the SDK
 * reports that as an empty response.
 *
 * These pin the rewrite to exactly that: flatten content, never touch anything
 * else in the body, and leave a message that is already a string alone so the
 * turns that already worked keep working byte for byte.
 */

import assert from "node:assert/strict";
process.env.CF_COMPAT = "0"; // do not patch fetch inside a unit test
const { flattenContent, normaliseBody } = await import("../src/cf-compat.js");

// ── content arrays become text ───────────────────────────────────────────────
assert.equal(flattenContent([{ type: "text", text: "a" }, { type: "text", text: "b" }]), "a\nb");
assert.equal(flattenContent("already a string"), "already a string");
assert.equal(flattenContent(null), "", "null content is the assistant-with-tool_calls case");
assert.equal(flattenContent(undefined), "");
assert.equal(flattenContent([]), "", "an empty parts array is empty text, not the string '[]'");
// A part with no text contributes nothing rather than "undefined".
assert.equal(flattenContent([{ type: "image", url: "x" }, { type: "text", text: "t" }]), "t");

// ── the body rewrite ─────────────────────────────────────────────────────────
{
  const raw = JSON.stringify({
    model: "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    stream: true,
    max_tokens: 18852,
    tools: [{ type: "function", function: { name: "read" } }],
    messages: [
      { role: "system", content: [{ type: "text", text: "be helpful" }] },
      { role: "user", content: "how do I test a Move module?" },
      { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "read", arguments: "{}" } }] },
      { role: "tool", tool_call_id: "c1", content: [{ type: "text", text: "ENOENT" }] },
    ],
  });
  const { body, changed } = normaliseBody(raw);
  const out = JSON.parse(body);

  assert.equal(changed, 3, "the two arrays and the null, not the string");
  assert.equal(out.messages[0].content, "be helpful");
  assert.equal(out.messages[1].content, "how do I test a Move module?");
  assert.equal(out.messages[2].content, "", "null becomes empty text, and the key stays present");
  assert.equal(out.messages[3].content, "ENOENT");

  // Everything a tool call needs to round-trip must survive untouched.
  assert.deepEqual(out.messages[2].tool_calls, JSON.parse(raw).messages[2].tool_calls,
    "tool_calls are what the next turn is built from");
  assert.equal(out.messages[3].tool_call_id, "c1");
  assert.deepEqual(out.tools, JSON.parse(raw).tools, "the tool schemas are not ours to rewrite");
  assert.equal(out.model, "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  assert.equal(out.max_tokens, 18852);
  assert.equal(out.stream, true);
}

// ── a body that needs nothing is returned byte for byte ──────────────────────
{
  const raw = JSON.stringify({ messages: [{ role: "user", content: "hello" }], model: "m" });
  const { body, changed } = normaliseBody(raw);
  assert.equal(changed, 0);
  assert.equal(body, raw, "the first turn already worked; it must go out unchanged");
}

// ── anything that is not a chat body is left alone ───────────────────────────
assert.equal(normaliseBody("not json").changed, 0);
assert.equal(normaliseBody(JSON.stringify({ prompt: "x" })).changed, 0, "the {prompt} variant has no messages");
assert.equal(normaliseBody(JSON.stringify({ messages: "nonsense" })).changed, 0);

console.log("cf-compat: content flattens to strings, tool_calls and every other field survive");
