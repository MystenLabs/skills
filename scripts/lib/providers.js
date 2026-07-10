/**
 * Provider abstraction for multi-model eval support.
 *
 * Each provider implements:
 *   async generate(systemPrompt, userPrompt, options) => string
 *
 * Options: { model, maxTokens }
 */

// ── Anthropic ────────────────────────────────────────────────────────
class AnthropicProvider {
  constructor() {
    this.name = "anthropic";
    this._client = null;
  }

  async _getClient() {
    if (!this._client) {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      this._client = new Anthropic();
    }
    return this._client;
  }

  async generate(systemPrompt, userPrompt, options = {}) {
    const client = await this._getClient();
    const model = options.model ?? "claude-sonnet-4-6";
    const maxTokens = options.maxTokens ?? 4096;

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    return response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  }
}

// ── OpenAI ───────────────────────────────────────────────────────────
class OpenAIProvider {
  constructor() {
    this.name = "openai";
    this._client = null;
  }

  async _getClient() {
    if (!this._client) {
      const { default: OpenAI } = await import("openai");
      this._client = new OpenAI();
    }
    return this._client;
  }

  async generate(systemPrompt, userPrompt, options = {}) {
    const client = await this._getClient();
    const model = options.model ?? "gpt-4o";
    const maxTokens = options.maxTokens ?? 4096;

    const response = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    return response.choices[0]?.message?.content ?? "";
  }
}

// ── Claude Code CLI ──────────────────────────────────────────────────
class ClaudeCodeProvider {
  constructor() {
    this.name = "claude-code";
  }

  async generate(systemPrompt, userPrompt, options = {}) {
    const { execSync } = await import("child_process");
    const { writeFileSync, mkdtempSync, unlinkSync } = await import("fs");
    const { join } = await import("path");
    const { tmpdir } = await import("os");

    const model = options.model ?? "sonnet";

    // Build the full prompt with system context prepended
    const fullPrompt = `${systemPrompt}\n\n---\n\nUser question:\n${userPrompt}`;

    // Write prompt to temp file to avoid shell escaping issues
    const tmpDir = mkdtempSync(join(tmpdir(), "eval-"));
    const promptFile = join(tmpDir, "prompt.txt");
    writeFileSync(promptFile, fullPrompt);

    try {
      const args = ["claude", "-p", "--output-format", "text", "--model", model];

      const result = execSync(`cat "${promptFile}" | ${args.join(" ")}`, {
        encoding: "utf-8",
        timeout: 120_000,
        maxBuffer: 1024 * 1024 * 10,
        stdio: ["pipe", "pipe", "pipe"],
      });

      return result.trim();
    } finally {
      try {
        unlinkSync(promptFile);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}

// ── Factory ──────────────────────────────────────────────────────────
const PROVIDERS = {
  anthropic: AnthropicProvider,
  openai: OpenAIProvider,
  "claude-code": ClaudeCodeProvider,
};

export function createProvider(name) {
  const Provider = PROVIDERS[name];
  if (!Provider) {
    const available = Object.keys(PROVIDERS).join(", ");
    throw new Error(`Unknown provider "${name}". Available: ${available}`);
  }
  return new Provider();
}

export function listProviders() {
  return Object.keys(PROVIDERS);
}
