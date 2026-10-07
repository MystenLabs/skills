/**
 * Context Layer Definitions
 *
 * The 4 evaluation layers represent increasing levels of context available
 * to the LLM. Each layer returns an EvalSessionConfig that can be passed
 * to createEvalSession().
 *
 * Layers:
 *   1. baseline        -- plain system prompt, no skills, no MCP
 *   2. with-skills     -- system prompt + Sui developer skills loaded
 *   3. with-skills-mcp -- skills + Kapa MCP search results injected
 *   4. mcp-only        -- MCP results only, no skills
 */

import { mcpSearch } from "./mcp-verify.js";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import type { EvalSessionConfig } from "./harness.js";
import type { Skill } from "@earendil-works/pi-coding-agent";

// ── Constants ────────────────────────────────────────────────────────

export const ALL_LAYERS = [
  "baseline",
  "with-skills",
  "with-skills-mcp",
  "mcp-only",
] as const;

export type LayerName = (typeof ALL_LAYERS)[number];

const BASE_SYSTEM_PROMPT =
  "You are a helpful developer assistant. Answer the user's question about Sui blockchain development.";

const KAPA_MCP_URL = "https://sui-docs-dashboard.mcp.kapa.ai";

// ── Skills loading ───────────────────────────────────────────────────

/**
 * Load all SKILL.md files from the skills directory and return them as
 * a concatenated string for system prompt injection (legacy approach)
 * and as an array of Skill objects for Pi's skills system.
 */
export function loadAllSkills(skillsDir: string | undefined): {
  content: string;
  skills: Skill[];
  count: number;
} {
  if (!skillsDir) {
    return { content: "", skills: [], count: 0 };
  }

  try {
    const dirs = readdirSync(skillsDir).filter((d) =>
      existsSync(join(skillsDir, d, "SKILL.md")),
    );

    let content = "";
    const skills: Skill[] = [];

    for (const name of dirs) {
      const skillFile = join(skillsDir, name, "SKILL.md");
      const text = readFileSync(skillFile, "utf-8");
      content += `\n\n<skill name="${name}">\n${text}\n</skill>\n`;

      skills.push({
        name,
        description: `Sui developer skill: ${name}`,
        filePath: skillFile,
        baseDir: join(skillsDir, name),
        source: "custom" as const,
      });
    }

    return { content, skills, count: dirs.length };
  } catch {
    return { content: "", skills: [], count: 0 };
  }
}

// ── Kapa MCP search ──────────────────────────────────────────────────

/**
 * Search the Kapa MCP endpoint for relevant documentation excerpts.
 */
export async function searchKapaMCP(query: string): Promise<string> {
  // Posting {query, top_k} to /search returned 404 on every call: the server
  // speaks JSON-RPC at its root and has no /search path. mcpSearch is the
  // implementation that works -- the one gating skill edits -- so this
  // delegates rather than keeping a second copy that can drift from it.
  const chunks = await mcpSearch(query);
  if (!chunks.length) return "";
  return chunks
    .map((c, i) => `[${i + 1}] ${c.source_url ?? "docs"}\n${c.content}`)
    .join("\n\n");
}

// ── System prompt builder ────────────────────────────────────────────

function buildSystemPrompt(
  layer: LayerName,
  skillsContent: string,
  mcpContext: string,
): string {
  let prompt = BASE_SYSTEM_PROMPT;

  if (
    (layer === "with-skills" || layer === "with-skills-mcp") &&
    skillsContent
  ) {
    prompt += `\n\nYou have access to the following Sui developer skills documentation:\n${skillsContent}`;
  }

  if ((layer === "with-skills-mcp" || layer === "mcp-only") && mcpContext) {
    prompt += `\n\nHere are relevant documentation excerpts:\n${mcpContext}`;
  }

  return prompt;
}

// ── Layer config factory ─────────────────────────────────────────────

export interface LayerContext {
  skillsContent: string;
  skills: Skill[];
  mcpContext: string;
}

/**
 * Build a layer configuration for a given prompt.
 *
 * For layers that need MCP context, the caller should pre-fetch the MCP
 * results and pass them in. This keeps the layer definitions pure and
 * testable.
 */
export function getLayerConfig(
  layer: LayerName,
  model: string,
  context: LayerContext,
): EvalSessionConfig {
  const systemPrompt = buildSystemPrompt(
    layer,
    context.skillsContent,
    context.mcpContext,
  );

  // For skill-aware layers, inject skills via Pi's resource loader
  const skills =
    layer === "with-skills" || layer === "with-skills-mcp"
      ? context.skills
      : [];

  return {
    model,
    systemPrompt,
    skills,
    // Evals are read-only -- no file editing or bash
    tools: ["read", "grep", "ls"],
  };
}

/**
 * Determine whether a layer needs MCP context pre-fetched.
 */
export function layerNeedsMcp(layer: LayerName): boolean {
  return layer === "with-skills-mcp" || layer === "mcp-only";
}

/**
 * Determine whether a layer needs skills content.
 */
export function layerNeedsSkills(layer: LayerName): boolean {
  return layer === "with-skills" || layer === "with-skills-mcp";
}
