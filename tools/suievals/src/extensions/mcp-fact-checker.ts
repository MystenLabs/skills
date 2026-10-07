/**
 * MCP Fact-Checker Extension
 *
 * After static evaluation, queries the Kapa MCP server at sui.mcp.kapa.ai
 * to fact-check failed expectations. Uses Claude Haiku to classify each
 * failure as:
 *   - VALID_FAILURE:  The expectation is correct and the model missed it
 *   - FALSE_NEGATIVE: The expectation is outdated/wrong; the model was right
 *   - UNCERTAIN:      Not enough documentation to determine
 *
 * False negatives are overridden (marked as passed) to reduce noise in
 * eval results caused by stale expectations.
 */

import type { CheckResult } from "../static-eval.js";
import { mcpSearch, mcpAvailable, mcpKey } from "../mcp-verify.js";

// ── Types ────────────────────────────────────────────────────────────

export type FactCheckVerdict = "VALID_FAILURE" | "FALSE_NEGATIVE" | "UNCERTAIN";

export interface FactCheckResult {
  verdict: FactCheckVerdict;
  reason: string;
}

export interface FactCheckedExpectation extends CheckResult {
  /** MCP fact-check result (only present for failed expectations) */
  mcpFactCheck?: FactCheckResult;
  /** Whether this failure was overridden as a false negative */
  overridden?: boolean;
}

// ── Configuration ───────────────────────────────────────────────────

const KAPA_MCP_URL = "https://sui-docs-dashboard.mcp.kapa.ai";
const MAX_FAILURES_TO_CHECK = 5;
const MCP_SEARCH_TIMEOUT_MS = 10_000;
const MAX_MCP_CONTEXT_LEN = 3000;

// ── MCP search ──────────────────────────────────────────────────────

/**
 * Search the Kapa MCP endpoint for documentation relevant to a query.
 */
async function searchKapaMCP(
  query: string,
  apiKey: string,
  topK: number = 2,
): Promise<string> {
  if (!query || query.length < 10 || !apiKey) return "";
  // /search is not a path this server has; it speaks JSON-RPC at its root.
  // Every call here 404'd and returned "", so the skills eval's MCP fact
  // check has been silently checking nothing. mcpSearch is the working
  // client, shared with the gate on skill edits.
  const chunks = await mcpSearch(query, MCP_SEARCH_TIMEOUT_MS);
  return chunks
    .slice(0, topK)
    .map((c) => `[${c.source_url ?? ""}] ${c.content}`)
    .join("\n\n")
    .slice(0, MAX_MCP_CONTEXT_LEN);
}

// ── Haiku classification ────────────────────────────────────────────

/**
 * Use Claude Haiku to classify whether a failed expectation is a valid
 * failure or a false negative based on official documentation.
 */
async function classifyFailure(
  expectation: string,
  modelResponse: string,
  mcpContext: string,
  anthropicApiKey: string,
  judgeModel: string = "claude-haiku-4-5-20251001",
): Promise<FactCheckResult> {
  try {
    const prompt = `You are verifying whether a documentation eval expectation is still accurate.

EXPECTATION (what we expected the response to contain):
${expectation}

MODEL RESPONSE (what the model actually said):
${modelResponse.slice(0, 2000)}

OFFICIAL DOCUMENTATION (from Kapa MCP -- source of truth):
${mcpContext}

Question: Is the expectation still correct according to the official docs?
- If the expectation is CORRECT and the response fails to meet it: "VALID_FAILURE"
- If the expectation is OUTDATED or WRONG (the response is actually correct): "FALSE_NEGATIVE"
- If the docs don't cover this topic well enough to tell: "UNCERTAIN"

Return ONLY JSON: {"verdict": "VALID_FAILURE"|"FALSE_NEGATIVE"|"UNCERTAIN", "reason": "<one sentence>"}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: judgeModel,
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return {
        verdict: "UNCERTAIN",
        reason: `Haiku API error: ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const match = text.match(/\{[\s\S]*?"verdict"[\s\S]*?\}/);
    if (match) {
      return JSON.parse(match[0]) as FactCheckResult;
    }

    return {
      verdict: "UNCERTAIN",
      reason: "Could not parse fact-check response",
    };
  } catch (err) {
    return {
      verdict: "UNCERTAIN",
      reason: `Fact-check error: ${(err as Error).message.slice(0, 80)}`,
    };
  }
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Fact-check failed expectations against the Kapa MCP documentation.
 *
 * This function:
 * 1. Filters for failed expectations from the static eval results
 * 2. Queries MCP for documentation relevant to the prompt + failures
 * 3. Uses Haiku to classify each failure
 * 4. Overrides false negatives (marks them as passed)
 * 5. Returns the updated check results with fact-check metadata
 *
 * @param checks - Static eval check results
 * @param modelResponse - The full model response text
 * @param prompt - The original eval prompt
 * @returns Updated check results with fact-check annotations
 */
export async function factCheckFailedExpectations(
  checks: CheckResult[],
  modelResponse: string,
  prompt: string,
): Promise<FactCheckedExpectation[]> {
  // mcpAvailable() covers both the off switch and the credential, so a fact
  // check never reports a verdict from retrieval that did not happen.
  const apiKey = mcpAvailable() ? mcpKey() : "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  const judgeModel =
    process.env.JUDGE_MODEL ?? "claude-haiku-4-5-20251001";

  // If no API keys, return checks unchanged
  if (!apiKey || !anthropicKey) {
    return checks.map((c) => ({ ...c }));
  }

  const result: FactCheckedExpectation[] = checks.map((c) => ({ ...c }));

  const failures = result.filter((c) => !c.passed);
  if (failures.length === 0) return result;

  // Query MCP for documentation about the topic
  const searchQuery = `${prompt} ${failures[0].expectation}`;
  const mcpContext = await searchKapaMCP(searchQuery, apiKey);
  if (!mcpContext) return result;

  // Fact-check each failure (capped to avoid excessive API calls)
  const toCheck = failures.slice(0, MAX_FAILURES_TO_CHECK);

  for (const failure of toCheck) {
    const verdict = await classifyFailure(
      failure.expectation,
      modelResponse,
      mcpContext,
      anthropicKey,
      judgeModel,
    );

    failure.mcpFactCheck = verdict;

    if (verdict.verdict === "FALSE_NEGATIVE") {
      failure.overridden = true;
      failure.passed = true;
    }
  }

  return result;
}

/**
 * Recalculate pass rate and score after fact-check overrides.
 */
export function recalculateAfterFactCheck(
  checks: FactCheckedExpectation[],
): { passed: number; total: number; passRate: number; score: number } {
  const passed = checks.filter((c) => c.passed).length;
  const total = checks.length;
  const passRate = total > 0 ? passed / total : 0;

  let score: number;
  if (passRate <= 0.2) score = 1;
  else if (passRate <= 0.4) score = 2;
  else if (passRate <= 0.6) score = 3;
  else if (passRate <= 0.8) score = 4;
  else score = 5;

  return { passed, total, passRate, score };
}
