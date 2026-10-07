/**
 * Pi Eval Harness
 *
 * Wraps the Pi SDK to run structured evaluations. Creates ephemeral agent
 * sessions, sends prompts, and collects the full response text plus tool
 * call metadata via event subscriptions.
 *
 * Based on: https://pi.dev/docs/latest/sdk
 */

import {
  createAgentSession,
  defineTool,
  ModelRuntime,
  SessionManager,
  type Skill,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

// ── Types ────────────────────────────────────────────────────────────

export interface EvalSessionConfig {
  /** Model identifier in "provider/id" format, e.g. "anthropic/claude-sonnet-4-6" */
  model: string;
  /** Optional list of tool names to enable (built-in + custom) */
  tools?: string[];
  /** Custom tool definitions (e.g., sandbox tools for E2E) */
  customTools?: any[];
  /** Override for the system prompt */
  systemPrompt?: string;
  /** Skills to inject */
  skills?: Skill[];
  /** Working directory for the session */
  cwd?: string;
  /** Timeout in ms (default: 120000) */
  timeout?: number;
  /**
   * Sampling temperature for the model under test.
   *
   * Left unset, every run samples at the provider default, which is 1.0 for the
   * providers here. The A/B this suite exists for then compares two draws from a
   * distribution rather than two configurations: running the same model with and
   * without the skills moved 31 evals up and 32 down, which is what two runs of
   * the *same* configuration would also do.
   *
   * Pi applies samplingParams only on OpenAI-compatible APIs and ignores it
   * elsewhere, so this pins the OpenAI models and not the Anthropic ones. It is
   * not a complete fix, and the honest way to read any A/B here is against a
   * measured noise floor -- the same configuration run twice -- rather than
   * against zero.
   *
   * Defaults to 0 for every runner. It was set in one of the five and that is how
   * the problem survived: a fix applied at a call site only ever fixes that call
   * site, and the other four pipelines kept sampling at the provider default with
   * nothing to say they were. Pass a number to override, or null to deliberately
   * sample at the provider default.
   */
  temperature?: number | null;
}

export interface ToolCallRecord {
  toolName: string;
  startTime: number;
  endTime?: number;
  isError: boolean;
}

export interface PromptResult {
  /** The full accumulated response text */
  response: string;
  /** All messages in the session after the prompt completes */
  messages: unknown[];
  /** Tool calls made during the response */
  toolCalls: ToolCallRecord[];
}

export interface EvalSession {
  /** Send a prompt and collect the full response */
  runPrompt(text: string): Promise<PromptResult>;
  /** Clean up the session */
  dispose(): void;
}

// ── Pi Auth Setup ────────────────────────────────────────────────────
//
// The Pi SDK's setRuntimeApiKey() passes auth checks but the streaming
// call silently returns empty responses for OpenAI models. Writing
// ~/.pi/agent/auth.json makes API keys first-class and fixes streaming.

let _authEnsured = false;

function ensurePiAuth() {
  if (_authEnsured) return;
  _authEnsured = true;

  const home = process.env.HOME ?? process.env.USERPROFILE ?? "/tmp";
  const authDir = join(home, ".pi", "agent");
  const authFile = join(authDir, "auth.json");

  if (existsSync(authFile)) return;

  const auth: Record<string, any> = {};
  if (process.env.ANTHROPIC_API_KEY) {
    auth.anthropic = { type: "api_key", key: process.env.ANTHROPIC_API_KEY };
  }
  if (process.env.OPENAI_API_KEY) {
    auth.openai = { type: "api_key", key: process.env.OPENAI_API_KEY };
    auth["openai-compat"] = { type: "api_key", key: process.env.OPENAI_API_KEY };
  }
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    auth.google = { type: "api_key", key: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY };
  }

  if (Object.keys(auth).length === 0) return;

  mkdirSync(authDir, { recursive: true });
  writeFileSync(authFile, JSON.stringify(auth, null, 2));
  console.log(`  Pi auth: wrote ${authFile} with ${Object.keys(auth).join(", ")} keys`);
}

// ── ModelRuntime (cached) ────────────────────────────────────────────

let _modelRuntime: Awaited<ReturnType<typeof ModelRuntime.create>> | undefined;

async function getModelRuntime(): Promise<Awaited<ReturnType<typeof ModelRuntime.create>>> {
  if (!_modelRuntime) {
    // Write auth.json before creating the runtime — the SDK reads it at init.
    ensurePiAuth();

    _modelRuntime = await ModelRuntime.create({
      allowModelNetwork: true,
      modelRefreshTimeoutMs: 15_000,
    });

    // Also inject via setRuntimeApiKey as a belt-and-suspenders measure.
    if (process.env.ANTHROPIC_API_KEY) {
      await _modelRuntime.setRuntimeApiKey("anthropic", process.env.ANTHROPIC_API_KEY);
    }
    if (process.env.OPENAI_API_KEY) {
      await _modelRuntime.setRuntimeApiKey("openai", process.env.OPENAI_API_KEY);
      await _modelRuntime.setRuntimeApiKey("openai-compat", process.env.OPENAI_API_KEY).catch(() => {});
    }
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
      await _modelRuntime.setRuntimeApiKey(
        "google",
        process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
      );
    }
  }
  return _modelRuntime;
}

/** Force re-initialization (e.g., after changing env vars) */
export function clearServicesCache() {
  _modelRuntime = undefined;
}

// ── Model resolution ─────────────────────────────────────────────────

export interface ResolvedModel {
  model: any;
  reasoning: boolean;
}

/**
 * Resolve a model string like "anthropic/claude-sonnet-4-6" into a Model object.
 * Returns both the model and whether it requires reasoning/thinkingLevel.
 */
export async function resolveModel(modelStr: string): Promise<ResolvedModel> {
  const [provider, ...idParts] = modelStr.split("/");
  const id = idParts.join("/");

  const runtime = await getModelRuntime();

  // List available models — the catalog has authoritative metadata (reasoning, etc.)
  const available = await runtime.models.getAvailable();
  console.log(`  Pi catalog: ${available.length} models total`);

  // Look up catalog entry for metadata (reasoning flag, thinkingLevelMap, etc.)
  const catalogEntry = id
    ? available.find((m: any) => m.provider === provider && m.id === id)
    : null;
  const isReasoning = catalogEntry?.reasoning === true;

  if (catalogEntry) {
    console.log(`  Catalog "${id}": reasoning=${isReasoning}, api=${catalogEntry.api ?? "?"}`);
  }

  // Try runtime.getModel() first — includes built-in + custom models.json entries
  if (id && typeof runtime.getModel === "function") {
    const model = runtime.getModel(provider, id);
    if (model) {
      console.log(`  Resolved "${modelStr}" via runtime.getModel()`);
      return { model, reasoning: isReasoning };
    }
  }

  // Search available models list
  if (id) {
    const exact = available.find((m: any) => m.provider === provider && m.id === id);
    if (exact) {
      console.log(`  Resolved "${modelStr}" via exact match in available list`);
      return { model: exact, reasoning: isReasoning };
    }
  }

  const fuzzy = available.find((m: any) => m.id === modelStr || m.id.includes(id || modelStr));
  if (fuzzy) {
    const fuzzyReasoning = fuzzy.reasoning === true;
    console.log(`  Resolved "${modelStr}" via fuzzy match -> ${fuzzy.provider}/${fuzzy.id}`);
    return { model: fuzzy, reasoning: fuzzyReasoning };
  }

  const openaiModels = available.filter((m: any) => m.provider === "openai");
  throw new Error(
    `Model "${modelStr}" not found in Pi catalog after network refresh. ` +
    `Available OpenAI (${openaiModels.length}): ${openaiModels.map((m: any) => m.id).join(", ")}`
  );
}

// ── JSON Schema → TypeBox conversion ─────────────────────────────────

function jsonSchemaToTypeBox(schema: any): any {
  if (!schema || typeof schema !== "object") return Type.Any();
  if (schema.type === "object" && schema.properties) {
    const props: Record<string, any> = {};
    const required = new Set(schema.required ?? []);
    for (const [key, prop] of Object.entries(schema.properties)) {
      const converted = jsonSchemaToTypeBox(prop);
      props[key] = required.has(key) ? converted : Type.Optional(converted);
    }
    return Type.Object(props);
  }
  if (schema.type === "string") return Type.String({ description: (schema as any).description });
  if (schema.type === "number" || schema.type === "integer") return Type.Number({ description: (schema as any).description });
  if (schema.type === "boolean") return Type.Boolean({ description: (schema as any).description });
  if (schema.type === "array") return Type.Array(jsonSchemaToTypeBox((schema as any).items ?? {}));
  return Type.Any();
}

// ── Session creation ─────────────────────────────────────────────────

/**
 * Create an eval session — a Pi agent session configured for structured evaluation.
 */
export async function createEvalSession(config: EvalSessionConfig): Promise<EvalSession> {
  const cwd = config.cwd ?? process.cwd();
  const { model, reasoning: hasReasoning } = await resolveModel(config.model);
  const modelRuntime = await getModelRuntime();

  // Convert custom tools to use defineTool + TypeBox schemas
  const piCustomTools = config.customTools?.map((tool: any) =>
    defineTool({
      name: tool.name,
      label: tool.label ?? tool.name,
      description: tool.description,
      parameters: jsonSchemaToTypeBox(tool.parameters),
      execute: tool.execute,
    }),
  );

  // Build tool allowlist: custom tool names + any requested built-in tools
  const toolNames: string[] = [];
  if (config.customTools?.length) {
    toolNames.push(...config.customTools.map((t: any) => t.name));
  }
  if (config.tools?.length) {
    toolNames.push(...config.tools);
  }

  // Models with reasoning: true require thinkingLevel to be set,
  // otherwise Pi SDK silently returns empty responses with 0 tool calls.
  // The reasoning flag comes from the Pi catalog (resolveModel), since
  // runtime.getModel() does not expose it as a direct property.
  const sessionOpts: Record<string, any> = {
    model,
    modelRuntime,  // Required for auth to work
    sessionManager: SessionManager.inMemory(),
    cwd,
    ...(hasReasoning ? { thinkingLevel: "medium" } : {}),
    // Honoured by openai-completions, openai-responses and azure-openai-responses;
    // ignored by the others. See the note on EvalSessionConfig.temperature.
    //
    // Defaulted here rather than left to callers, because leaving it to callers is
    // exactly what produced four pipelines reporting differences they could not
    // have detected.
    ...(config.temperature === null
      ? {}
      : { samplingParams: { temperature: config.temperature ?? 0 } }),
  };

  if (hasReasoning) {
    console.log(`  Model has reasoning=true, setting thinkingLevel=medium`);
  }

  if (piCustomTools?.length) {
    sessionOpts.customTools = piCustomTools;
  }

  // Only set tools allowlist if we have specific tools to enable.
  // When empty and no custom tools, use noTools to disable everything.
  if (toolNames.length > 0) {
    sessionOpts.tools = toolNames;
  } else {
    sessionOpts.noTools = "all";
  }

  if (config.systemPrompt) {
    sessionOpts.systemPrompt = config.systemPrompt;
  }

  const { session } = await createAgentSession(sessionOpts);

  // ── Event-based response collection ──
  //
  // Per the SDK docs, streaming text arrives via message_update events
  // with assistantMessageEvent.type === "text_delta".

  let responseText = "";
  let toolCalls: ToolCallRecord[] = [];
  let currentToolCall: ToolCallRecord | null = null;

  let eventCount = 0;
  let eventTypes = new Set<string>();

  session.subscribe((event: any) => {
    eventCount++;
    eventTypes.add(event.type);

    // Streaming text deltas
    if (event.type === "message_update" && event.assistantMessageEvent?.type === "text_delta") {
      responseText += event.assistantMessageEvent.delta;
    }
    // Tool execution tracking
    if (event.type === "tool_execution_start") {
      currentToolCall = {
        toolName: event.toolName ?? "unknown",
        startTime: Date.now(),
        isError: false,
      };
    }
    if (event.type === "tool_execution_end") {
      if (currentToolCall) {
        currentToolCall.endTime = Date.now();
        currentToolCall.isError = event.isError ?? false;
        toolCalls.push(currentToolCall);
        currentToolCall = null;
      }
    }
  });

  return {
    async runPrompt(text: string): Promise<PromptResult> {
      responseText = "";
      toolCalls = [];
      currentToolCall = null;
      eventCount = 0;
      eventTypes = new Set();

      await session.prompt(text);

      // Fallback: if event-based collection yielded no text (OpenAI models
      // don't emit message_update/text_delta events), extract the last
      // assistant message from the session's message history.
      if (responseText.length === 0 && session.messages?.length) {
        const msgs = session.messages as any[];
        for (let i = msgs.length - 1; i >= 0; i--) {
          const msg = msgs[i];
          if (msg.role === "assistant") {
            // Handle different message content formats
            if (typeof msg.content === "string" && msg.content.length > 0) {
              responseText = msg.content;
              break;
            }
            if (Array.isArray(msg.content)) {
              const textParts = msg.content
                .filter((p: any) => p.type === "text" && p.text)
                .map((p: any) => p.text);
              if (textParts.length > 0) {
                responseText = textParts.join("\n");
                break;
              }
            }
            // Try .text directly (some SDK versions)
            if (typeof msg.text === "string" && msg.text.length > 0) {
              responseText = msg.text;
              break;
            }
          }
        }
      }

      // Debug: log event summary
      console.log(`      [debug] ${eventCount} events, types: [${[...eventTypes].join(", ")}], response: ${responseText.length} chars, toolCalls: ${toolCalls.length}`);
      if (responseText.length === 0) {
        // Dump last message for debugging
        const msgs = session.messages as any[] ?? [];
        const last = msgs[msgs.length - 1];
        if (last) {
          console.log(`      [debug] last message role=${last.role}, content=${JSON.stringify(last.content)?.slice(0, 300)}`);
          if (last.errorMessage) console.log(`      [debug] errorMessage: ${last.errorMessage}`);
          if (last.usage) console.log(`      [debug] usage: ${JSON.stringify(last.usage)}`);
          if (last.stopReason) console.log(`      [debug] stopReason: ${last.stopReason}`);
        }
      }

      return {
        response: responseText,
        messages: session.messages ?? [],
        toolCalls: [...toolCalls],
      };
    },

    dispose() {
      session.dispose();
    },
  };
}
