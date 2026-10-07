/**
 * Fact verification against the Kapa MCP server (the indexed Sui docs).
 *
 * Two questions this module answers:
 *
 *   verifyStatement(text)  Does the docs corpus support every checkable claim
 *                          in this text? Used on eval expectations before they
 *                          may count as a skill gap, and on proposed SKILL.md
 *                          edits before they may be proposed.
 *
 * The grader is a model, but a "supported" verdict is only accepted when the
 * quote it cites is a verbatim substring of a retrieved chunk. A verdict
 * without a real quote is downgraded to not_found, so the model cannot
 * manufacture support. "contradicted" likewise requires a verbatim quote of
 * the contradicting passage.
 *
 * Retrieval is the MCP `tools/call` JSON-RPC shape the snippet scanner already
 * uses in CI (Bearer token, server root, SSE or JSON response). Results are
 * cached by claim hash in reports/mcp-verification-cache.json so a rerun over
 * the same 900 expectations costs nothing.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export const MCP_URL = process.env.KAPA_MCP_URL ?? "https://sui-docs-dashboard.mcp.kapa.ai/";
export const MCP_TOOL = process.env.KAPA_MCP_TOOL ?? "search_sui_knowledge_sources";
const MODEL = process.env.VERIFY_MODEL ?? "claude-opus-5";
const CACHE_TTL_DAYS = 30;

export type Verdict = "supported" | "contradicted" | "not_found";

export interface Chunk {
  source_url: string;
  content: string;
}

export interface Claim {
  claim: string;
  category: "api_name" | "parameter" | "behavior" | "path_or_url" | "value" | "other";
}

export interface ClaimResult {
  claim: string;
  category: string;
  verdict: Verdict;
  quote: string;
  source: string;
  checkedAt: string;
}

export interface StatementResult {
  status: "verified" | "contradicted" | "unverifiable" | "no_claims";
  claims: ClaimResult[];
}

// ── MCP retrieval ────────────────────────────────────────────────────

/**
 * The MCP credential, and only that.
 *
 * KAPA_API_KEY_SUI used to be a fallback here. It is the analytics key, passed
 * by docs-review, weekly-analytics, agent-adoption and six pi-* workflows to
 * read question data from api.kapa.ai -- a different surface that costs nothing
 * against the search plan. Accepting it as an MCP credential meant every one of
 * those jobs silently held the ability to spend the plan, which is how "which
 * workflows can reach the MCP server" had a much longer answer than the list of
 * workflows that meant to.
 */
export function mcpKey(): string {
  return process.env.KAPA_MCP_API_KEY ?? "";
}

/**
 * MCP retrieval is OFF. Nothing calls the server unless MCP_ENABLED is "1".
 *
 * The history, because the shape of the mistake is the reason for the switch.
 * The plan allows 3,000 searches a month. Saturday 3 October the pipeline made
 * over 30,000 in a day and the overage was $15,000. The answer then was a cap
 * here, at the chokepoint the callers share, set to 50 searches per process.
 * It did not hold, and on 5 October the plan was passed again.
 *
 * Two reasons it did not hold, both worth keeping written down:
 *
 *   The cap counts per process, and nothing caps the processes. pi-eval-run
 *   crosses models with layers, so one dispatch is up to 68 jobs; at the 60 the
 *   workflow asked for, that one dispatch is 4,080 searches on a 3,000 monthly
 *   plan. Per-job arithmetic looked prudent in every individual workflow.
 *
 *   It was not actually the only chokepoint. The comment here used to claim
 *   every MCP call in the repository passed through this function. Four did --
 *   layers.ts, oracle.ts, code-reviewer.ts and mcp-fact-checker.ts all delegate
 *   here -- but scan-snippets.js opened its own https.request, and docs-checks
 *   runs it across seven sites with no counter anywhere.
 *
 * So this is a switch rather than a number. A budget has to be divided correctly
 * against a job count nobody is tracking; a switch that defaults to off cannot
 * be defeated by multiplying jobs. MCP_MAX_CALLS still bounds a process once the
 * switch is on, as a second line, but it is no longer what stands between the
 * pipeline and the invoice.
 *
 * Turning it back on means setting MCP_ENABLED=1 *and* satisfying the monthly
 * check in mcp-allowance.yml, and it should be one workflow at a time.
 */
const MCP_ENABLED = process.env.MCP_ENABLED === "1";
// 50, because the budget is 3,000 a month and roughly thirty scheduled jobs can
// reach this. A job that needs more sets MCP_MAX_CALLS in its workflow, where
// the number sits next to the schedule that multiplies it.
const MCP_MAX_CALLS = Math.max(0, Number(process.env.MCP_MAX_CALLS ?? 50) || 0);
let mcpCalls = 0;
let budgetAnnounced = false;
let offAnnounced = false;

/** How many searches this process has made. */
export function mcpCallCount(): number {
  return mcpCalls;
}

/**
 * Whether a search can reach the server at all.
 *
 * Callers that would otherwise read an empty result as a passed check -- the
 * fact checkers especially -- use this to report "unchecked" instead.
 */
export function mcpAvailable(): boolean {
  return MCP_ENABLED && mcpKey() !== "";
}

/**
 * Write this process's usage where the monthly check can sum it.
 *
 * Self-measured rather than read back from the vendor. Kapa's analytics API
 * reports threads, which are end-user conversations, not the tools/call searches
 * this pipeline makes, so it cannot see the traffic that produced the overage.
 * Every search goes through mcpSearch, so mcpSearch is what knows.
 *
 * One file per run, never a shared ledger. Appending to a single committed file
 * from jobs that finish at the same time is how a 14,000-line report turned into
 * a merge of two runs that matched neither, and a usage record that silently
 * loses entries is worse than none.
 *
 * Registered at exit so no entry point has to remember to call it.
 */
function recordUsage(): void {
  if (!mcpCalls) return;
  const dir = process.env.MCP_USAGE_DIR;
  if (!dir) return;
  try {
    mkdirSync(dir, { recursive: true });
    const id = process.env.GITHUB_RUN_ID ?? `local-${process.pid}`;
    const job = (process.env.GITHUB_JOB ?? "run").replace(/[^\w.-]/g, "-");
    writeFileSync(join(dir, `${id}-${job}-${process.pid}.json`), JSON.stringify({
      at: new Date().toISOString(),
      workflow: process.env.GITHUB_WORKFLOW ?? null,
      run_id: process.env.GITHUB_RUN_ID ?? null,
      job,
      searches: mcpCalls,
      budget: MCP_MAX_CALLS,
      // True when the cap stopped it, which is the signal that this job wants
      // either a larger budget or less retrieval.
      hit_budget: mcpCalls >= MCP_MAX_CALLS,
    }, null, 2) + "\n");
  } catch {
    // Usage accounting must never be the thing that fails a run.
  }
}
process.on("exit", recordUsage);

/**
 * Search the docs corpus. Returns [] when retrieval is off, when there is no
 * key, or when the server is unreachable.
 *
 * Every caller already treats [] as "the server had nothing", so an off switch
 * degrades retrieval instead of failing runs. Callers that must not record a
 * passed check on an empty result ask `mcpAvailable()` first.
 */
export async function mcpSearch(query: string, timeoutMs = 20_000): Promise<Chunk[]> {
  if (!MCP_ENABLED) {
    if (!offAnnounced) {
      offAnnounced = true;
      console.warn(
        "[mcp] retrieval is off (MCP_ENABLED is not 1). No request was sent. " +
        "Anything that depends on docs retrieval is running without it.",
      );
    }
    return [];
  }
  const key = mcpKey();
  if (!key) return [];
  if (mcpCalls >= MCP_MAX_CALLS) {
    if (!budgetAnnounced) {
      budgetAnnounced = true;
      console.warn(
        `[mcp] budget spent: ${mcpCalls} searches, the limit for this process. ` +
        `Further searches return nothing rather than billing for them. ` +
        `Raise MCP_MAX_CALLS in the workflow if this job genuinely needs more.`,
      );
    }
    return [];
  }
  mcpCalls += 1;
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: "1",
    method: "tools/call",
    params: { name: MCP_TOOL, arguments: { query } },
  });
  let raw = "";
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.warn(`  mcp: HTTP ${res.status} for ${JSON.stringify(query.slice(0, 60))}`);
      return [];
    }
    raw = await res.text();
  } catch (err) {
    console.warn(`  mcp: ${(err as Error).message}`);
    return [];
  }
  // SSE (`data: {...}`) or a plain JSON-RPC envelope.
  let envelope: unknown = null;
  for (const line of raw.split("\n")) {
    if (line.startsWith("data:")) {
      try { envelope = JSON.parse(line.slice(5)); break; } catch { /* next line */ }
    }
  }
  if (envelope === null) {
    try { envelope = JSON.parse(raw); } catch { return []; }
  }
  const text = (envelope as { result?: { content?: { text?: string }[] } })?.result?.content?.[0]?.text ?? "";
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as { results?: Chunk[] };
    return (parsed.results ?? []).filter((c) => c && typeof c.content === "string");
  } catch {
    return [{ source_url: "mcp", content: text }];
  }
}

// ── Cache ────────────────────────────────────────────────────────────

interface CacheFile { entries: Record<string, ClaimResult> }

export class VerificationCache {
  private data: CacheFile;
  constructor(private path: string) {
    this.data = existsSync(path) ? (JSON.parse(readFileSync(path, "utf-8")) as CacheFile) : { entries: {} };
    this.data.entries ??= {};
  }
  key(claim: string): string {
    return createHash("sha1").update(claim.trim().toLowerCase().replace(/\s+/g, " ")).digest("hex").slice(0, 16);
  }
  get(claim: string): ClaimResult | null {
    const e = this.data.entries[this.key(claim)];
    if (!e) return null;
    const age = (Date.now() - Date.parse(e.checkedAt)) / 86_400_000;
    return age <= CACHE_TTL_DAYS ? e : null;
  }
  set(r: ClaimResult): void {
    this.data.entries[this.key(r.claim)] = r;
  }
  save(): void {
    writeFileSync(this.path, JSON.stringify(this.data, null, 2) + "\n");
  }
}

// ── Model helpers ────────────────────────────────────────────────────

let _client: Anthropic | null = null;
function client(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  // Match the proposer: ride out a busy period rather than failing the run.
  return (_client ??= new Anthropic({ maxRetries: 6 }));
}

function firstText(resp: Anthropic.Message): string {
  const b = resp.content.find((c) => c.type === "text");
  return b && b.type === "text" ? b.text : "";
}

const CLAIMS_SCHEMA = {
  type: "object",
  properties: {
    claims: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string" },
          category: { type: "string", enum: ["api_name", "parameter", "behavior", "path_or_url", "value", "other"] },
        },
        required: ["claim", "category"],
        additionalProperties: false,
      },
    },
  },
  required: ["claims"],
  additionalProperties: false,
};

/**
 * Turn a statement into checkable factual claims. An eval expectation such as
 * "Passes both network and baseUrl to the constructor" becomes "The
 * SuiGrpcClient constructor takes network and baseUrl options". Style and
 * formatting expectations ("uses bullet points") yield no claims.
 */
export async function extractClaims(text: string, context = ""): Promise<Claim[]> {
  const c = client();
  if (!c) return [];
  const resp = await c.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system:
      "You extract checkable factual claims about Sui, Move, Walrus, and the Mysten SDKs " +
      "from short statements. A claim is something the official documentation could confirm " +
      "or refute: an API, type, function, parameter, CLI flag, path, URL, config value, or a " +
      "stated behaviour. Assertions about what a tool does -- the compiler warns or errors, " +
      "the linter flags it, the build fails, a command prints something -- are behaviour and " +
      "must be extracted; a skill shipped \"the compiler warns about the combination\" with " +
      "nothing behind it. Rewrite each claim as one self-contained sentence naming the concrete " +
      "thing (for example 'SuiGrpcClient is imported from @mysten/sui/grpc'). Ignore style, " +
      "formatting, tone, and vague quality statements. Return at most 4 claims. If nothing is " +
      "checkable, return an empty list.",
    messages: [{
      role: "user",
      content: (context ? `CONTEXT (the task the statement is about):\n${context.slice(0, 1500)}\n\n` : "") +
        `STATEMENT:\n${text.slice(0, 2000)}`,
    }],
    output_config: { format: { type: "json_schema", schema: CLAIMS_SCHEMA } },
  });
  if (resp.stop_reason === "refusal") return [];
  try {
    return (JSON.parse(firstText(resp)) as { claims: Claim[] }).claims.slice(0, 4);
  } catch {
    return [];
  }
}

const GRADE_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["supported", "contradicted", "not_found"] },
    quote: { type: "string" },
    source_index: { type: "integer" },
  },
  required: ["verdict", "quote", "source_index"],
  additionalProperties: false,
};

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Grade one claim against retrieved chunks. The quote must be verbatim. */
const EXPECTATION_SYSTEM =
  "You decide whether the Sui documentation AGREES with a grading criterion used to score model " +
  "answers. Judge the criterion as written, including its polarity: a criterion that says an " +
  "answer should NOT do something agrees with documentation that discourages, deprecates, or warns " +
  "against that thing, even if the documentation never calls it invalid.\n\n" +
  "supported   the passages back the criterion, including when they advise exactly what it asks for\n" +
  "contradicted the passages show the criterion would mark a CORRECT answer wrong: the thing it " +
  "forbids is what the docs recommend, the API it demands does not exist, or the name it requires " +
  "is not the current one\n" +
  "not_found   the passages do not settle it\n\n" +
  "Scope is part of the claim. A statement that is true of one client, one package, or one case, but written as though it were true of all of them, is contradicted, not supported. Check that the passages support the claim as broadly as it is stated. Likewise a figure the source describes as varying is contradicted when the claim states it as fixed.\n\n" +
  "Judge the substance the criterion is testing, not incidental wording. A near-miss in a name, a " +
  "parenthetical example, or a detail the criterion mentions in passing is not a contradiction; " +
  "that is not_found. Copy the decisive sentence VERBATIM into `quote` with its passage index. " +
  "For not_found use an empty quote and -1.";

/**
 * Grade an eval expectation as written, without turning it into a claim first.
 *
 * Extracting a claim from a directive inverts it: "does not use `public entry`"
 * became "`public entry` is not valid", which the docs contradict while fully
 * agreeing with the expectation. Eleven of eighteen flagged expectations were
 * artifacts of that, so the expectation is now judged in its own words.
 */
export async function gradeExpectation(expectation: string, chunks: Chunk[], context = ""): Promise<Omit<ClaimResult, "claim" | "category" | "checkedAt">> {
  const c = client();
  if (!c || chunks.length === 0) return { verdict: "not_found", quote: "", source: "" };
  const passages = chunks.slice(0, 8).map((ch, i) => `[${i}] ${ch.source_url}\n${ch.content.slice(0, 2500)}`).join("\n\n");
  const resp = await c.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: EXPECTATION_SYSTEM,
    messages: [{
      role: "user",
      content: (context ? `TASK THE ANSWER WAS GRADED ON:\n${context.slice(0, 1200)}\n\n` : "") +
        `GRADING CRITERION:\n${expectation}\n\nPASSAGES:\n${passages}`,
    }],
    output_config: { format: { type: "json_schema", schema: GRADE_SCHEMA } },
  });
  if (resp.stop_reason === "refusal") return { verdict: "not_found", quote: "", source: "" };
  try {
    return gateVerdict(JSON.parse(firstText(resp)), chunks, expectation);
  } catch {
    return { verdict: "not_found", quote: "", source: "" };
  }
}

export async function gradeClaim(claim: string, chunks: Chunk[]): Promise<Omit<ClaimResult, "claim" | "category" | "checkedAt">> {
  const c = client();
  if (!c || chunks.length === 0) return { verdict: "not_found", quote: "", source: "" };
  const passages = chunks.slice(0, 8).map((ch, i) =>
    `[${i}] ${ch.source_url}\n${ch.content.slice(0, 2500)}`).join("\n\n");
  const resp = await c.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system:
      "You are a strict fact checker for Sui documentation. Decide whether the passages " +
      "SUPPORT the claim, CONTRADICT it, or say nothing decisive (not_found). Supported means a " +
      "passage states the same fact; a related example or a different API with a similar name " +
      "is not_found. Contradicted means a passage states the opposite (a different import path, " +
      "a parameter that does not exist, a deprecated API recommended). Copy the decisive sentence " +
      "VERBATIM into `quote` and give the passage index in `source_index`. For not_found, quote " +
      "is empty and source_index is -1.",
    messages: [{ role: "user", content: `CLAIM:\n${claim}\n\nPASSAGES:\n${passages}` }],
    output_config: { format: { type: "json_schema", schema: GRADE_SCHEMA } },
  });
  if (resp.stop_reason === "refusal") return { verdict: "not_found", quote: "", source: "" };
  let data: GraderOutput;
  try {
    data = JSON.parse(firstText(resp));
  } catch {
    return { verdict: "not_found", quote: "", source: "" };
  }
  return gateVerdict(data, chunks, claim);
}

/**
 * The identifiers an expectation is actually about, most specific first.
 *
 * A contrast is stripped first. "Uses tx.split_coins (snake_case) not
 * tx.splitCoins" names two symbols and is about the first; leaving both in would
 * let a passage about the second count as evidence, which is exactly how five Rust
 * expectations came to be "contradicted" by the TypeScript documentation.
 */
export function subjectIdentifiers(expectation: string): string[] {
  const subject = expectation
    .replace(/\((?:NOT|not)\s[^)]*\)/g, " ")
    .replace(/[,;(]\s*(?:not|NOT|rather than|instead of)\s+[^);]*/g, " ")
    .replace(/\s+(?:not|NOT|rather than|instead of)\s+\S+.*$/g, " ");

  const found = new Set<string>();
  for (const re of [
    /@[\w-]+\/[\w/.-]+/g,              // @mysten/sui/transactions
    /\b\w+(?:::\w+)+/g,                // deepbook::pool::Pool
    /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, // split_coins, try_build
    /\b[a-z][a-z0-9]*\.[a-z][\w.]*\b/g,  // tx.split_coins, client.core.listBalances
    /\b[a-z]+[A-Z][\w$]*\b/g,           // splitCoins
    /\b[A-Z][a-z0-9]+(?:[A-Z][\w$]*)+\b/g, // TransactionBuilder
  ]) {
    for (const m of subject.matchAll(re)) found.add(m[0]);
  }
  // Most specific first: a scoped package or qualified path beats a bare word.
  return [...found].sort((a, b) => b.length - a.length);
}

/**
 * Is the cited passage about the same thing as the expectation?
 *
 * The quote gate above proves the grader did not invent its evidence. It does not
 * prove the evidence is on topic, and that is the failure this suite actually had:
 * a search for a Rust expectation returns the TypeScript page, the grader reads a
 * genuine difference between two different SDKs, and records "contradicted". Of the
 * 19 contradictions recorded, five were Rust-versus-TypeScript, one was an MVR
 * example quoted against a different package name, and one was a flash-loan cap
 * quoted from a module that does not implement it.
 *
 * So a passage may only carry a verdict about an identifier it actually contains.
 * Matching is case-sensitive on purpose: splitCoins is not split_coins, and
 * treating them as the same symbol is the whole mistake.
 */
export function passageIsOnTopic(expectation: string, content: string): boolean {
  const ids = subjectIdentifiers(expectation);
  if (ids.length === 0) return true; // prose with no symbol to anchor on

  // A qualified name -- scoped package, :: path, snake_case, dotted call -- is
  // specific enough that a passage about something else will not contain it, and
  // specific enough to tell split_coins from splitCoins. When the expectation has
  // one, that is the anchor. Otherwise a bare name like RandomGenerator will do,
  // because requiring the longest of several bare names rejects passages that are
  // plainly on topic.
  const qualified = ids.filter((i) => /[/:._]/.test(i));
  const anchors = qualified.length ? qualified : ids;
  return anchors.some((i) => content.includes(i));
}

export interface GraderOutput { verdict: Verdict; quote: string; source_index: number }

/**
 * The gate: a verdict is only as good as its verbatim quote. A "supported" or
 * "contradicted" verdict whose quote is not a substring of the cited chunk
 * becomes not_found, so a grader cannot manufacture evidence.
 */
export function gateVerdict(
  data: GraderOutput,
  chunks: Chunk[],
  expectation = "",
): Omit<ClaimResult, "claim" | "category" | "checkedAt"> {
  if (!data || data.verdict === "not_found") return { verdict: "not_found", quote: "", source: "" };
  const chunk = chunks[data.source_index];
  const quote = (data.quote ?? "").trim();
  if (!chunk || quote.length < 12 || !norm(chunk.content).includes(norm(quote))) {
    return { verdict: "not_found", quote: "", source: "" };
  }
  // A verdict may only rest on a passage about the same symbol. Without this a
  // page about another SDK settles a question it was never asked.
  if (expectation && !passageIsOnTopic(expectation, chunk.content)) {
    return { verdict: "not_found", quote: "", source: "" };
  }
  return { verdict: data.verdict, quote: quote.slice(0, 400), source: chunk.source_url };
}

/** Verify one claim end to end, with caching. */
export async function verifyClaim(claim: Claim, cache?: VerificationCache): Promise<ClaimResult> {
  const cached = cache?.get(claim.claim);
  if (cached) return cached;
  const chunks = await mcpSearch(claim.claim);
  const graded = await gradeClaim(claim.claim, chunks);
  const result: ClaimResult = { claim: claim.claim, category: claim.category, ...graded, checkedAt: new Date().toISOString() };
  cache?.set(result);
  return result;
}

export function summarize(claims: ClaimResult[]): StatementResult["status"] {
  if (claims.length === 0) return "no_claims";
  if (claims.some((c) => c.verdict === "contradicted")) return "contradicted";
  if (claims.every((c) => c.verdict === "supported")) return "verified";
  return "unverifiable";
}

/** Extract and verify every claim in a statement. */
export async function verifyStatement(text: string, context = "", cache?: VerificationCache): Promise<StatementResult> {
  const claims = await extractClaims(text, context);
  const results: ClaimResult[] = [];
  for (const cl of claims) {
    results.push(await verifyClaim(cl, cache));
    await new Promise((r) => setTimeout(r, 250));
  }
  return { status: summarize(results), claims: results };
}

/**
 * Verify an eval expectation in its own words. Searches on the expectation
 * itself, then grades it as a criterion rather than as a derived claim.
 */
export async function verifyExpectation(expectation: string, context = "", cache?: VerificationCache): Promise<StatementResult> {
  const cached = cache?.get(`expectation::${expectation}`);
  if (cached) return { status: summarize([cached]), claims: [cached] };
  const chunks = await mcpSearch(`${expectation} ${context}`.slice(0, 380));
  const graded = await gradeExpectation(expectation, chunks, context);
  const result: ClaimResult = {
    claim: expectation, category: "other", ...graded, checkedAt: new Date().toISOString(),
  };
  if (cache) cache.set({ ...result, claim: `expectation::${expectation}` });
  return { status: summarize([result]), claims: [result] };
}

export function available(): { model: boolean; mcp: boolean } {
  return { model: !!process.env.ANTHROPIC_API_KEY, mcp: !!mcpKey() };
}

// ── The code itself, as a verification target ───────────────────────
//
// Mirrors tools/correspondence/source_index.py. The docs cannot prove a symbol
// is absent, because documentation does not enumerate what does not exist.
// Only the source can. A skill edit shipped `getEvents` and
// `getTransactionBlocks`, neither of which the SDK has, past a fact check that
// read only prose; the Python side had this and the skills path did not.

import { readdirSync, statSync } from "fs";

export interface SymbolDef { name: string; kind: string; signature: string; origin: string; pkg: string }

const TS_DECL = /^\s*(?:export\s+)?(?:declare\s+)?(function|class|interface|type|const|enum)\s+([A-Za-z_$][\w$]*)/;
const TS_MEMBER = /^[ \t]+(?:readonly\s+|static\s+|abstract\s+|get\s+|set\s+|async\s+)*([A-Za-z_$][\w$]*)\s*[(<:]/;
const SKIP_MEMBERS = new Set(["constructor", "then", "catch", "finally", "toString", "valueOf"]);
/** Needs an internal capital, an underscore, or a `$`, so prose never matches. */
const API_SHAPE = /^(?:[a-z][a-z0-9]*(?:[A-Z][\w$]*)+|[A-Z][a-z0-9]+(?:[A-Z][\w$]*)+|\w+_\w+)$/;

export class SymbolIndex {
  private byName = new Map<string, SymbolDef[]>();
  packages = new Set<string>();

  get size(): number { return this.byName.size; }
  lookup(name: string): SymbolDef[] { return this.byName.get(name) ?? []; }

  private add(s: SymbolDef) {
    const list = this.byName.get(s.name);
    if (list) list.push(s); else this.byName.set(s.name, [s]);
    this.packages.add(s.pkg);
  }

  private parse(text: string, origin: string, pkg: string) {
    let depth = 0;
    let container: string | null = null;
    for (const raw of text.split("\n")) {
      const line = raw.trimEnd();
      const open = (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      if (!line || /^\s*(\/\/|\*|\/\*)/.test(line)) { depth += open; continue; }
      const d = TS_DECL.exec(line);
      if (d && depth === 0) {
        this.add({ name: d[2], kind: `ts-${d[1]}`, signature: line.trim(), origin, pkg });
        container = d[1] === "class" || d[1] === "interface" ? d[2] : null;
      } else if (depth > 0 && container) {
        const m = TS_MEMBER.exec(line);
        if (m && !SKIP_MEMBERS.has(m[1])) {
          this.add({ name: m[1], kind: "ts-method", signature: `${container}.${line.trim()}`, origin, pkg });
        }
      }
      depth += open;
      if (depth <= 0) container = null;
    }
  }

  /** Index the installed @mysten packages: shipped declarations and src. */
  static build(nodeModules: string, scope = "@mysten"): SymbolIndex {
    const idx = new SymbolIndex();
    const root = join(nodeModules, scope);
    if (!existsSync(root)) return idx;
    const walk = (dir: string, out: string[]) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== "__tests__") walk(p, out); }
        else if (/\.(d\.m?ts|d\.cts)$/.test(e.name) || (/\.ts$/.test(e.name) && p.includes(`${"/"}src${"/"}`))) {
          if (!/\.(map|test\.ts|spec\.ts)$/.test(e.name)) out.push(p);
        }
      }
    };
    for (const pkgName of readdirSync(root)) {
      const pkgDir = join(root, pkgName);
      try { if (!statSync(pkgDir).isDirectory()) continue; } catch { continue; }
      const files: string[] = [];
      walk(pkgDir, files);
      for (const f of files.slice(0, 600)) {
        try { idx.parse(readFileSync(f, "utf-8"), f.slice(pkgDir.length + 1), `${scope}/${pkgName}`); }
        catch { /* skip unreadable */ }
      }
    }
    return idx;
  }

  summary(): string {
    return this.size === 0 ? "nothing indexed"
      : `${this.size} symbols from ${this.packages.size} package(s)`;
  }
}

/**
 * Names that are part of the language or the runtime, not of any SDK. The
 * index is built from `@mysten` packages, so gating on it alone accused
 * `setInterval` and `flatMap` of being invented Sui APIs.
 */
const BUILTINS = new Set([
  // Globals and host APIs.
  "setInterval", "clearInterval", "setTimeout", "clearTimeout", "queueMicrotask",
  "structuredClone", "fetch", "AbortController", "AbortSignal", "URLSearchParams",
  "TextEncoder", "TextDecoder", "localStorage", "sessionStorage", "requestAnimationFrame",
  "addEventListener", "removeEventListener", "getElementById", "querySelector",
  // Standard library methods a snippet routinely calls.
  "flatMap", "forEach", "toString", "valueOf", "toFixed", "toLowerCase", "toUpperCase",
  "startsWith", "endsWith", "padStart", "padEnd", "trimStart", "trimEnd", "codePointAt",
  "charCodeAt", "fromEntries", "fromCharCode", "isArray", "isInteger", "isFinite", "isNaN",
  "parseInt", "parseFloat", "toISOString", "getTime", "hasOwnProperty", "lastIndexOf",
  "findIndex", "findLast", "toSorted", "toReversed", "getPrototypeOf", "defineProperty",
  "stringify", "allSettled", "toJSON", "catch", "finally",
  // React and framework hooks that appear in dapp-kit examples.
  "useState", "useEffect", "useMemo", "useCallback", "useRef", "useContext", "useReducer",
  "useQuery", "useMutation", "useQueryClient", "useInfiniteQuery", "useSuspenseQuery",
  // TanStack Query's own result surface. dapp-kit hooks return it, so a skill
  // page names these constantly; they belong to React Query, not to `@mysten`.
  // `hasNextPage` happens to collide with an indexed page type, so gating on
  // the index alone dropped `fetchNextPage` and kept its twin.
  "fetchNextPage", "fetchPreviousPage", "hasNextPage", "hasPreviousPage",
  "isFetchingNextPage", "isLoading", "isPending", "isFetching", "isError", "isSuccess",
  "refetch", "invalidateQueries", "queryKey", "queryFn",
]);

/** Fenced blocks whose contents this TypeScript index can speak to. */
const TS_FENCE = /^(ts|tsx|js|jsx|typescript|javascript|mjs|cjs)$/i;

interface Fence { lang: string; body: string }

function fences(text: string): Fence[] {
  const out: Fence[] = [];
  for (const m of text.matchAll(/^[ \t]*```+([\w+-]*)[^\n]*\n([\s\S]*?)^[ \t]*```+/gm)) {
    out.push({ lang: (m[1] || "").toLowerCase(), body: m[2] });
  }
  return out;
}

/**
 * Names the edit itself declares. A snippet that writes `const PACKAGE_ID = …`
 * or `public struct MintCap has key` has defined its own identifier; demanding
 * the SDK export it is nonsense. Covers TypeScript and Move, because skill
 * pages mix both.
 */
function declaredLocally(text: string): Set<string> {
  const out = new Set<string>();
  const patterns = [
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g,
    /\b(?:function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g,
    /\b(?:public\s+)?(?:entry\s+)?fun\s+([A-Za-z_][\w]*)/g,
    /\b(?:public\s+)?struct\s+([A-Za-z_][\w]*)/g,
    /\bmodule\s+[\w:]*::([A-Za-z_][\w]*)/g,
    /\buse\s+[\w:]*::\{?\s*([A-Za-z_][\w]*)/g,
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) out.add(m[1]);
  }
  return out;
}

function harvest(source: string, original: string, out: Set<string>): void {
  const add = (tok: string) => {
    // An underscore rules a name out. The index holds TypeScript exports, which
    // are camelCase or PascalCase; `change_admin`, `reserve_x` and `PACKAGE_ID`
    // are Move identifiers or local constants and were never going to be in it.
    if (tok.includes("_")) return;
    if (BUILTINS.has(tok)) return;
    if (!API_SHAPE.test(tok)) return;
    if (new RegExp(`\\b${tok}\\b`).test(original)) return;
    out.add(tok);
  };
  for (const span of source.match(/`[^`\n]{2,80}`/g) ?? []) {
    for (const tok of span.match(/[A-Za-z_$][\w$]*/g) ?? []) add(tok);
  }
  for (const m of source.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) add(m[1]);
}

const MOVE_FENCE = /^[ \t]*```+move\b/im;
const TS_FENCE_PAGE = /^[ \t]*```+(?:ts|tsx|js|jsx|typescript|javascript|mjs|cjs)\b/im;
/** Syntax no TypeScript snippet contains. */
const MOVE_SYNTAX = /\b(?:public\s+(?:entry\s+)?fun|entry\s+fun|fun\s+\w+\s*\(|public\s+struct|has\s+(?:key|store|copy|drop)|&mut\s+TxContext|module\s+\w+::|::\w+::|u(?:8|16|32|64|128|256)\b|vector<)/;
/** A snake_case identifier inside inline code is a Move name, not an SDK one. */
const MOVE_INLINE = /`[^`\n]*\b[a-z][a-z0-9]*_[a-z0-9_]+\b[^`\n]*`/;

/**
 * Whether this edit is talking about Move. A fence settles it; so does Move
 * syntax or a snake_case inline name in the prose. Failing those, a page that
 * carries Move fences and nothing TypeScript is a Move page.
 */
function moveContext(text: string, original: string): boolean {
  if (MOVE_FENCE.test(text) || MOVE_SYNTAX.test(text) || MOVE_INLINE.test(text)) return true;
  return MOVE_FENCE.test(original) && !TS_FENCE_PAGE.test(original);
}

/**
 * API-shaped names an edit introduces that are not already on the page.
 *
 * Only prose, inline code, and fences this index can actually speak to are
 * examined. A Move fence is skipped outright: checking Move identifiers
 * against a TypeScript index means every one of them looks invented, which is
 * what the first run of this gate did to eleven otherwise sound edits.
 *
 * Prose needs the same care. `AdminCap` and `XpEarned` are Move structs and
 * events that happen to be named like TypeScript types, and the index holds
 * only `@mysten` TypeScript, so it cannot speak to them either. In a Move
 * context, PascalCase names are therefore left alone. camelCase survives the
 * exemption because Move functions are snake_case: a camelCase name really is
 * a claim about an SDK method, which is the invention this gate exists to
 * catch.
 */
export function newSymbols(text: string, original: string): string[] {
  const blocks = fences(text);
  const gated = blocks.filter((f) => f.lang === "" || TS_FENCE.test(f.lang));
  // Prose and inline spans: everything outside a fence.
  const prose = text.replace(/^[ \t]*```+[\w+-]*[^\n]*\n[\s\S]*?^[ \t]*```+/gm, "\n");

  const out = new Set<string>();
  harvest(prose, original, out);
  for (const f of gated) harvest(f.body, original, out);

  // Anything the edit declares itself, or that only ever shows up in a fence
  // written in another language, is not an invented SDK name.
  const local = declaredLocally(text);
  const otherLangOnly = new Set<string>();
  for (const f of blocks) {
    if (f.lang === "" || TS_FENCE.test(f.lang)) continue;
    for (const tok of f.body.match(/[A-Za-z_$][\w$]*/g) ?? []) otherLangOnly.add(tok);
  }
  const inMove = moveContext(text, original);
  for (const name of [...out]) {
    if (local.has(name)) out.delete(name);
    else if (inMove && /^[A-Z]/.test(name)) out.delete(name);
    else if (otherLangOnly.has(name) && !gated.some((f) => new RegExp(`\\b${name}\\b`).test(f.body))) {
      out.delete(name);
    }
  }
  return [...out];
}

/** Symbols this edit introduces that the indexed source does not have. */
export function missingSymbols(index: SymbolIndex, text: string, original: string): string[] {
  if (index.size === 0) return [];
  return newSymbols(text, original).filter((n) => index.lookup(n).length === 0);
}
