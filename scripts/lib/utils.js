/**
 * Shared utilities for eval runners.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname, basename, join } from "path";
import { execSync } from "child_process";
import { glob } from "glob";

export const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "../..");

// ── Load .env file if present (key=value, one per line) ──────────────
const envPath = join(ROOT, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

// ── CLI arg helpers ──────────────────────────────────────────────────
export function getFlag(args, name) {
  const prefixed = args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  if (prefixed) return prefixed;
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

export function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

// ── Semaphore for concurrency control ────────────────────────────────
export class Semaphore {
  constructor(max) {
    this._max = max;
    this._active = 0;
    this._queue = [];
  }
  async acquire() {
    if (this._active < this._max) {
      this._active++;
      return;
    }
    await new Promise((resolve) => this._queue.push(resolve));
  }
  release() {
    this._active--;
    if (this._queue.length > 0) {
      this._active++;
      this._queue.shift()();
    }
  }
}

// ── Timeout wrapper ──────────────────────────────────────────────────
export function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Eval timed out after ${ms}ms: ${label}`)), ms)
    ),
  ]);
}

// ── Discover eval files ──────────────────────────────────────────────
export function discoverEvalFiles(filename = "evals.json", { skillFilter, changedOnly } = {}) {
  const pattern = join(ROOT, `**/evals/${filename}`);
  let files = glob.sync(pattern, { ignore: ["**/node_modules/**", "**/template/**"] });

  if (skillFilter) {
    files = files.filter((f) => f.includes(`/${skillFilter}/`));
    if (files.length === 0) {
      console.error(`No evals found for skill: ${skillFilter}`);
      process.exit(1);
    }
  }

  if (changedOnly) {
    try {
      const diff = execSync("git diff --name-only origin/main...HEAD", {
        cwd: ROOT,
        encoding: "utf-8",
      });
      const changedSkills = new Set(
        diff
          .split("\n")
          .filter(Boolean)
          .map((f) => f.split("/")[0])
      );
      files = files.filter((f) => {
        const rel = f.replace(ROOT + "/", "");
        const skill = rel.split("/")[0];
        return changedSkills.has(skill);
      });
    } catch {
      console.warn("Could not determine changed files, running all evals");
    }
  }

  return files;
}

// ── Load skill context (all .md files) ───────────────────────────────
export function loadSkillContext(evalFilePath) {
  const skillDir = resolve(dirname(evalFilePath), "..");
  const skillName = basename(skillDir);
  const mdFiles = glob.sync(join(skillDir, "*.md"), {
    ignore: ["**/node_modules/**"],
  });

  const parts = [];
  const skillMd = mdFiles.find((f) => basename(f) === "SKILL.md");
  if (skillMd) {
    parts.push(`# ${skillName} — SKILL.md\n\n${readFileSync(skillMd, "utf-8")}`);
  }
  for (const f of mdFiles.sort()) {
    if (basename(f) === "SKILL.md") continue;
    parts.push(`# ${skillName} — ${basename(f)}\n\n${readFileSync(f, "utf-8")}`);
  }

  return parts.join("\n\n---\n\n");
}

// ── Parse evals (handles both object-wrapped and array formats) ──────
export function parseEvals(filePath) {
  const raw = JSON.parse(readFileSync(filePath, "utf-8"));
  if (Array.isArray(raw)) return raw;
  if (raw.evals && Array.isArray(raw.evals)) return raw.evals;
  throw new Error(`Unexpected eval format in ${filePath}`);
}

// ── GitHub Actions summary helper ────────────────────────────────────
export function writeGitHubSummary(content) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, content, { flag: "a" });
  }
}
