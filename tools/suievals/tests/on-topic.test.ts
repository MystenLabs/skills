#!/usr/bin/env -S npx tsx
/**
 * A verdict may only rest on a passage about the same symbol.
 *
 * The quote gate proves a grader did not invent its evidence. It does not prove
 * the evidence answers the question, and that is the failure this suite had: a
 * search for a Rust expectation returns the TypeScript page, the grader reads a
 * real difference between two different SDKs, and writes down "contradicted".
 *
 * Of 19 recorded contradictions, five were Rust against TypeScript, one quoted an
 * MVR example for a different package, and one quoted DeepBook v2's CLOB module at
 * an expectation about v3. Each of those was then excluded from scoring as an
 * unsourced expectation, so a correct expectation was being deleted on the word of
 * a page that was never about it.
 */

import assert from "node:assert/strict";
import { subjectIdentifiers, passageIsOnTopic, gateVerdict } from "../src/mcp-verify.js";

// ── The contrast is not the subject ──────────────────────────────────────────
{
  // "Uses X not Y" is about X. Leaving Y in lets a page about Y carry the verdict,
  // which is exactly how the TypeScript docs came to contradict a Rust expectation.
  const ids = subjectIdentifiers("Uses tx.split_coins (snake_case) not tx.splitCoins");
  assert.ok(ids.includes("tx.split_coins"), `expected tx.split_coins: ${JSON.stringify(ids)}`);
  assert.ok(!ids.includes("tx.splitCoins"), `the contrast must be dropped: ${JSON.stringify(ids)}`);
  assert.ok(!ids.includes("splitCoins"), `nor its bare form: ${JSON.stringify(ids)}`);
}
{
  const ids = subjectIdentifiers("Recommends gRPC / SuiGrpcClient, NOT JSON-RPC / SuiClient");
  assert.ok(ids.includes("SuiGrpcClient"));
  assert.ok(!ids.includes("SuiClient"), `the forbidden form is not the subject: ${JSON.stringify(ids)}`);
}

// ── Rust is not TypeScript, and the difference is one character ─────────────
{
  const e = "Uses tx.split_coins (snake_case) not tx.splitCoins";
  assert.equal(
    passageIsOnTopic(e, "const [coin1, coin2] = tx.splitCoins(coin, [amount1, amount2]);"),
    false,
    "the TypeScript page must not settle a Rust expectation",
  );
  assert.equal(
    passageIsOnTopic(e, "let coin = tx.split_coins(gas, vec![amount]);"),
    true,
    "the Rust page does",
  );
}
{
  assert.equal(
    passageIsOnTopic("Calls tx.try_build() at the end (offline build)",
      "const kindBytes = await tx.build({ onlyTransactionKind: true });"),
    false,
    "tx.build is not tx.try_build",
  );
}
{
  // Matching is case-sensitive on purpose: these are different symbols.
  assert.equal(passageIsOnTopic("Calls set_gas_budget", "setGasBudget() sets the budget"), false);
  assert.equal(passageIsOnTopic("Calls set_gas_budget", "tx.set_gas_budget(1000)"), true);
}

// ── The wrong package, and the wrong version of the right one ───────────────
{
  assert.equal(
    passageIsOnTopic('The response includes the MVR dependency: deepbook = { mvr = "@deepbook/core" }',
      'To depend on a package with `mvr` name `@example/package`, add `example = { r.mvr = "@example/package" }`'),
    false,
    "a generic example names no package and settles nothing",
  );
  assert.equal(
    passageIsOnTopic('The response includes the MVR dependency: deepbook = { mvr = "@deepbook/core" }',
      'New applications should use DeepBook version 3 by adding `deepbook = { mvr = "@deepbook/core" }`.'),
    true,
    "the page that names the package does",
  );
}
{
  assert.equal(
    passageIsOnTopic("The response shows importing: use deepbook::pool::Pool",
      'public struct <a href="../deepbook/clob.md#deepbook_clob_Pool">Pool</a>'),
    false,
    "v2's CLOB module is not v3's pool module",
  );
}

// ── Prose with no symbol still gets through ─────────────────────────────────
assert.equal(
  passageIsOnTopic("Explains the latency and cost tradeoff of streaming versus polling",
    "Streaming pushes an event as it commits, where polling pays a round trip per interval."),
  true,
  "an expectation naming no symbol has nothing to anchor on and is left to the grader",
);

// ── The gate downgrades rather than guesses ─────────────────────────────────
{
  const chunks = [{ source_url: "https://sdk.mystenlabs.com/typescript", content: "const [a, b] = tx.splitCoins(coin, [x]);" }];
  const off = gateVerdict(
    { verdict: "contradicted", quote: "const [a, b] = tx.splitCoins(coin, [x]);", source_index: 0 },
    chunks,
    "Uses tx.split_coins (snake_case) not tx.splitCoins",
  );
  assert.equal(off.verdict, "not_found", "an off-topic passage carries no verdict");
  assert.equal(off.quote, "");

  // On topic, the verdict stands and keeps its evidence.
  const onChunks = [{ source_url: "https://docs.rs/sui-transaction-builder", content: "tx.split_coins(gas, vec![amount]) builds the split." }];
  const on = gateVerdict(
    { verdict: "contradicted", quote: "tx.split_coins(gas, vec![amount]) builds the split.", source_index: 0 },
    onChunks,
    "Uses tx.split_coins (snake_case) not tx.splitCoins",
  );
  assert.equal(on.verdict, "contradicted");
  assert.equal(on.source, "https://docs.rs/sui-transaction-builder");

  // With no expectation passed, behaviour is unchanged -- the quote gate alone.
  const legacy = gateVerdict(
    { verdict: "contradicted", quote: "const [a, b] = tx.splitCoins(coin, [x]);", source_index: 0 },
    chunks,
  );
  assert.equal(legacy.verdict, "contradicted", "callers that pass no expectation keep the old behaviour");
}

console.log("on-topic: a passage may only settle a question about a symbol it contains");
