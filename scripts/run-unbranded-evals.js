#!/usr/bin/env node

/**
 * Unbranded Eval Runner
 *
 * Sends competitive/comparison prompts to models with NO skills, NO Sui context,
 * and NO system prompt bias. Captures raw responses and detects which chains
 * are mentioned. Results are for visibility only — no pass/fail grading.
 *
 * Usage:
 *   node scripts/run-unbranded-evals.js
 *   node scripts/run-unbranded-evals.js --provider openai --model gpt-4o
 *   node scripts/run-unbranded-evals.js --category "Gaming"
 *   node scripts/run-unbranded-evals.js --id chain-consumer-app
 *   node scripts/run-unbranded-evals.js --concurrency 5
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

import {
  ROOT,
  Semaphore,
  getFlag,
  hasFlag,
  withTimeout,
} from "./lib/utils.js";
import { createProvider } from "./lib/providers.js";

const args = process.argv.slice(2);

const providerName = getFlag(args, "provider") ?? "anthropic";
const modelFlag = getFlag(args, "model");
const concurrencyFlag = getFlag(args, "concurrency");
const timeoutFlag = getFlag(args, "timeout");
const idFilter = getFlag(args, "id");
const categoryFilter = getFlag(args, "category");

const EVAL_MODEL = modelFlag ?? process.env.EVAL_MODEL ?? "claude-sonnet-4-6";
const CONCURRENCY = parseInt(concurrencyFlag ?? "5", 10);
const EVAL_TIMEOUT = parseInt(timeoutFlag ?? "60000", 10);

const provider = createProvider(providerName);

// ── Neutral system prompt — no Sui bias ──────────────────────────────
const SYSTEM_PROMPT = `You are a knowledgeable blockchain technology advisor. Give honest, balanced recommendations based on the current state of the ecosystem in 2026. Consider technical merits, ecosystem maturity, developer experience, and real-world adoption. Be specific about which platforms you recommend and why.`;

// ── Chain detection ──────────────────────────────────────────────────
const CHAINS = [
  { name: "Sui", patterns: [/\bSui\b/i] },
  { name: "Solana", patterns: [/\bSolana\b/i] },
  { name: "Ethereum", patterns: [/\bEthereum\b/i, /\bETH\b/] },
  { name: "Aptos", patterns: [/\bAptos\b/i] },
  { name: "Avalanche", patterns: [/\bAvalanche\b/i, /\bAVAX\b/] },
  { name: "Polygon", patterns: [/\bPolygon\b/i, /\bPOL\b/] },
  { name: "Arbitrum", patterns: [/\bArbitrum\b/i] },
  { name: "Optimism", patterns: [/\bOptimism\b/i, /\bOP\b(?!\s*code)/] },
  { name: "Base", patterns: [/\bBase\b(?!\s*branch|\s*64)/i] },
  { name: "Near", patterns: [/\bNEAR\b/] },
  { name: "Cosmos", patterns: [/\bCosmos\b/i] },
  { name: "Polkadot", patterns: [/\bPolkadot\b/i] },
  { name: "Sei", patterns: [/\bSei\b/i] },
  { name: "Monad", patterns: [/\bMonad\b/i] },
  { name: "Move", patterns: [/\bMove\b(?:\s+language|\s+VM)?/] },
  { name: "Solidity", patterns: [/\bSolidity\b/i] },
  { name: "Rust", patterns: [/\bRust\b/i] },
];

function detectChains(text) {
  const mentioned = [];
  for (const chain of CHAINS) {
    if (chain.patterns.some((p) => p.test(text))) {
      mentioned.push(chain.name);
    }
  }
  return mentioned;
}

// Detect which chain is recommended as #1 (heuristic: first chain mentioned
// in the context of a recommendation)
function detectPrimaryRecommendation(text) {
  // Look for strong recommendation patterns
  const recPatterns = [
    /(?:recommend|suggest|pick|choose|go with|best.*?is|top choice.*?is|winner.*?is)\s+\**([A-Z][a-z]+)\**/i,
    /\*\*([A-Z][a-z]+)\*\*.*?(?:is the best|stands out|is my.*?pick|is the top)/i,
    /(?:^|\n)\s*(?:1\.|#+)\s*\**([A-Z][a-z]+)\**/m,
  ];

  for (const pat of recPatterns) {
    const match = text.match(pat);
    if (match) {
      const name = match[1];
      const chain = CHAINS.find((c) =>
        c.patterns.some((p) => p.test(name))
      );
      if (chain) return chain.name;
    }
  }

  // Fallback: first chain mentioned in first 500 chars
  const head = text.slice(0, 500);
  for (const chain of CHAINS.filter((c) => !["Move", "Solidity", "Rust"].includes(c.name))) {
    if (chain.patterns.some((p) => p.test(head))) {
      return chain.name;
    }
  }

  return null;
}

// ── Load prompts ─────────────────────────────────────────────────────
function loadPrompts() {
  const promptsPath = join(ROOT, "evals", "unbranded", "prompts.json");
  let prompts = JSON.parse(readFileSync(promptsPath, "utf-8"));

  if (idFilter) {
    prompts = prompts.filter((p) => p.id === idFilter);
  }
  if (categoryFilter) {
    prompts = prompts.filter((p) =>
      p.category.toLowerCase().includes(categoryFilter.toLowerCase())
    );
  }

  if (prompts.length === 0) {
    console.error("No prompts found matching filter.");
    process.exit(1);
  }
  return prompts;
}

// ── Concurrency ──────────────────────────────────────────────────────
const sem = new Semaphore(CONCURRENCY);

async function runOne(promptData) {
  await sem.acquire();
  try {
    const work = async () => {
      const response = await provider.generate(SYSTEM_PROMPT, promptData.prompt, {
        model: EVAL_MODEL,
        maxTokens: 2048,
      });
      const mentioned = detectChains(response);
      const primary = detectPrimaryRecommendation(response);

      return {
        id: promptData.id,
        category: promptData.category,
        prompt: promptData.prompt,
        chains_mentioned: mentioned,
        primary_recommendation: primary,
        mentions_sui: mentioned.includes("Sui"),
        response_excerpt: response.slice(0, 500),
        response_length: response.length,
      };
    };

    return await withTimeout(work(), EVAL_TIMEOUT, promptData.id);
  } catch (err) {
    return {
      id: promptData.id,
      category: promptData.category,
      prompt: promptData.prompt,
      chains_mentioned: [],
      primary_recommendation: null,
      mentions_sui: false,
      error: err.message.slice(0, 300),
    };
  } finally {
    sem.release();
  }
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  const prompts = loadPrompts();

  console.log(`\nUnbranded Eval Runner`);
  console.log(`  Provider       : ${providerName}`);
  console.log(`  Model          : ${EVAL_MODEL}`);
  console.log(`  Prompts        : ${prompts.length}`);
  console.log(`  Concurrency    : ${CONCURRENCY}\n`);

  const results = await Promise.all(prompts.map(runOne));

  // Print results grouped by category
  const categories = [...new Set(results.map((r) => r.category))];
  for (const cat of categories) {
    console.log(`\n${"━".repeat(60)}`);
    console.log(cat);
    console.log(`${"━".repeat(60)}`);
    for (const r of results.filter((r) => r.category === cat)) {
      if (r.error) {
        console.log(`  ${r.id} ... ERROR: ${r.error}`);
        continue;
      }
      const sui = r.mentions_sui ? " [Sui ✓]" : "";
      const primary = r.primary_recommendation ? ` → ${r.primary_recommendation}` : "";
      console.log(`  ${r.id}${primary}${sui}`);
      console.log(`    mentioned: ${r.chains_mentioned.join(", ") || "none"}`);
    }
  }

  // Summary stats
  const valid = results.filter((r) => !r.error);
  const mentionsSui = valid.filter((r) => r.mentions_sui).length;
  const primarySui = valid.filter((r) => r.primary_recommendation === "Sui").length;

  // Count primary recommendations
  const primaryCounts = {};
  for (const r of valid) {
    const p = r.primary_recommendation ?? "unclear";
    primaryCounts[p] = (primaryCounts[p] ?? 0) + 1;
  }
  const sorted = Object.entries(primaryCounts).sort((a, b) => b[1] - a[1]);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`UNBRANDED RESULTS: ${prompts.length} prompts | ${valid.length} responses`);
  console.log(`Sui mentioned: ${mentionsSui}/${valid.length} (${Math.round((mentionsSui / valid.length) * 100)}%)`);
  console.log(`Sui as primary pick: ${primarySui}/${valid.length} (${Math.round((primarySui / valid.length) * 100)}%)`);
  console.log(`\nPrimary recommendations:`);
  for (const [chain, count] of sorted) {
    console.log(`  ${chain}: ${count} (${Math.round((count / valid.length) * 100)}%)`);
  }
  console.log(`${"=".repeat(60)}\n`);

  // Write results
  const output = {
    metadata: {
      provider: providerName,
      model: EVAL_MODEL,
      timestamp: new Date().toISOString(),
      system_prompt: SYSTEM_PROMPT,
    },
    summary: {
      total: prompts.length,
      responses: valid.length,
      errors: results.filter((r) => r.error).length,
      sui_mentioned: mentionsSui,
      sui_mentioned_pct: Math.round((mentionsSui / valid.length) * 100),
      sui_primary: primarySui,
      sui_primary_pct: Math.round((primarySui / valid.length) * 100),
      primary_recommendations: Object.fromEntries(sorted),
    },
    results,
  };

  const outPath = join(ROOT, "scripts", "unbranded-eval-results.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Results written to ${outPath}`);

  // GitHub Actions summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      `## Unbranded Eval Results (${providerName} / ${EVAL_MODEL})\n`,
      `| Metric | Value |`,
      `|--------|------:|`,
      `| Prompts | ${prompts.length} |`,
      `| Sui mentioned | ${mentionsSui}/${valid.length} (${Math.round((mentionsSui / valid.length) * 100)}%) |`,
      `| Sui as primary pick | ${primarySui}/${valid.length} (${Math.round((primarySui / valid.length) * 100)}%) |`,
      "",
      `**Primary recommendations:** ${sorted.map(([c, n]) => `${c}: ${n}`).join(", ")}`,
    ].join("\n");
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: "a" });
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
