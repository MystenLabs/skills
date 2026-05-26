#!/usr/bin/env node

/**
 * Source Staleness Checker
 *
 * Extracts all `sources` URLs from every eval file, fetches each page,
 * hashes its content, and compares against a stored baseline
 * (.source-hashes.json). When a hash changes, the corresponding skill
 * is flagged for review.
 *
 * Also monitors specific paths in the Sui monorepo (MystenLabs/sui)
 * for recent commits using the GitHub API, based on the mapping in
 * sui-monorepo-watch.json.
 *
 * Usage:
 *   node scripts/check-sources.js                  # check all sources
 *   node scripts/check-sources.js --update          # update the baseline hashes
 *   node scripts/check-sources.js --since 2025-05-01  # monorepo commits since date
 *
 * Environment:
 *   GITHUB_TOKEN   optional, increases GitHub API rate limit
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname, basename, join } from "path";
import { createHash } from "crypto";
import { glob } from "glob";

// ── Load .env file if present (key=value, one per line) ──────────────
const ROOT_FOR_ENV = resolve(dirname(new URL(import.meta.url).pathname), "..");
const envPath = join(ROOT_FOR_ENV, ".env");
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

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const HASHES_FILE = join(ROOT, "scripts", ".source-hashes.json");
const WATCH_FILE = join(ROOT, "scripts", "sui-monorepo-watch.json");

const args = process.argv.slice(2);
const updateMode = args.includes("--update");
const sinceFlag = args.find((a) => a.startsWith("--since="))?.split("=")[1]
  ?? (args.includes("--since") ? args[args.indexOf("--since") + 1] : null);

// Default: check commits from the last 14 days
const since = sinceFlag ?? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";

// ── Helpers ───────────────────────────────────────────────────────────
function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = {};
    if (url.includes("api.github.com") && GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
    }
    headers["User-Agent"] = "sui-skill-staleness-checker";

    const res = await fetch(url, { signal: controller.signal, headers });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(id);
  }
}

// ── Parse evals and extract source URLs ──────────────────────────────
function extractSources() {
  const pattern = join(ROOT, "**/evals/evals.json");
  const files = glob.sync(pattern, { ignore: ["**/node_modules/**", "**/template/**"] });
  const sourceMap = {}; // url -> Set<skill names>

  for (const file of files) {
    const skillDir = basename(resolve(dirname(file), ".."));
    const raw = JSON.parse(readFileSync(file, "utf-8"));
    const evals = Array.isArray(raw) ? raw : raw.evals ?? [];

    for (const ev of evals) {
      for (const src of ev.sources ?? []) {
        // Skip non-URL sources (e.g. "docs.sui.io/references/framework/* (description)")
        const url = src.split(" ")[0];
        if (!url.startsWith("http")) continue;
        if (!sourceMap[url]) sourceMap[url] = new Set();
        sourceMap[url].add(skillDir);
      }
    }
  }

  return sourceMap;
}

// ── Check source URL hashes ──────────────────────────────────────────
async function checkSourceHashes(sourceMap) {
  const oldHashes = existsSync(HASHES_FILE)
    ? JSON.parse(readFileSync(HASHES_FILE, "utf-8"))
    : {};
  const newHashes = {};
  const changed = [];
  const errors = [];

  const urls = Object.keys(sourceMap);
  console.log(`Checking ${urls.length} source URLs...\n`);

  // Process in batches of 5 to avoid hammering servers
  for (let i = 0; i < urls.length; i += 5) {
    const batch = urls.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        try {
          const content = await fetchWithTimeout(url);
          const hash = sha256(content);
          newHashes[url] = hash;

          const skills = [...sourceMap[url]].join(", ");

          if (!oldHashes[url]) {
            console.log(`  NEW    ${url} → ${skills}`);
          } else if (oldHashes[url] !== hash) {
            console.log(`  CHANGED  ${url} → ${skills}`);
            changed.push({ url, skills: [...sourceMap[url]] });
          } else {
            // unchanged, no output
          }
        } catch (err) {
          console.log(`  ERROR  ${url} → ${err.message}`);
          errors.push({ url, error: err.message, skills: [...sourceMap[url]] });
          // Keep old hash if fetch fails
          if (oldHashes[url]) newHashes[url] = oldHashes[url];
        }
      })
    );
  }

  return { newHashes, changed, errors };
}

// ── Check Sui monorepo for recent commits ────────────────────────────
async function checkMonorepoChanges() {
  if (!existsSync(WATCH_FILE)) {
    console.log("\nNo sui-monorepo-watch.json found, skipping monorepo check.");
    return [];
  }

  const watchConfig = JSON.parse(readFileSync(WATCH_FILE, "utf-8"));
  const flagged = [];

  console.log(`\nChecking Sui monorepo for commits since ${since}...\n`);

  for (const [skill, paths] of Object.entries(watchConfig)) {
    for (const watchPath of paths) {
      try {
        const url = `https://api.github.com/repos/MystenLabs/sui/commits?path=${encodeURIComponent(watchPath)}&since=${since}&per_page=5`;
        const body = await fetchWithTimeout(url);
        const commits = JSON.parse(body);

        if (commits.length > 0) {
          console.log(`  ${skill}: ${commits.length} commit(s) touching ${watchPath}`);
          flagged.push({
            skill,
            path: watchPath,
            commits: commits.map((c) => ({
              sha: c.sha?.slice(0, 8),
              message: c.commit?.message?.split("\n")[0]?.slice(0, 80),
              date: c.commit?.committer?.date,
            })),
          });
        }
      } catch (err) {
        console.log(`  ${skill}: error checking ${watchPath} — ${err.message}`);
      }
    }
  }

  return flagged;
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  const sourceMap = extractSources();

  // 1. Check source URL hashes
  const { newHashes, changed, errors } = await checkSourceHashes(sourceMap);

  // 2. Check monorepo changes
  const monorepoChanges = await checkMonorepoChanges();

  // 3. Update hashes if requested
  if (updateMode) {
    writeFileSync(HASHES_FILE, JSON.stringify(newHashes, null, 2));
    console.log(`\nBaseline hashes updated in ${HASHES_FILE}`);
  }

  // 4. Summary
  console.log(`\n${"═".repeat(60)}`);
  console.log("STALENESS REPORT");
  console.log(`${"═".repeat(60)}`);

  const affectedSkills = new Set();

  if (changed.length > 0) {
    console.log(`\nSource URL changes detected (${changed.length}):`);
    for (const c of changed) {
      console.log(`  ${c.url}`);
      console.log(`    Affects: ${c.skills.join(", ")}`);
      c.skills.forEach((s) => affectedSkills.add(s));
    }
  }

  if (monorepoChanges.length > 0) {
    console.log(`\nSui monorepo changes detected (${monorepoChanges.length} paths):`);
    for (const m of monorepoChanges) {
      console.log(`  ${m.skill}: ${m.path} (${m.commits.length} commits)`);
      for (const c of m.commits.slice(0, 3)) {
        console.log(`    ${c.sha} ${c.message}`);
      }
      affectedSkills.add(m.skill);
    }
  }

  if (errors.length > 0) {
    console.log(`\nFetch errors (${errors.length}):`);
    for (const e of errors) {
      console.log(`  ${e.url}: ${e.error}`);
    }
  }

  if (affectedSkills.size === 0 && errors.length === 0) {
    console.log("\nAll sources are up to date.");
  } else if (affectedSkills.size > 0) {
    console.log(`\nSkills needing review: ${[...affectedSkills].join(", ")}`);
  }

  // 5. GitHub Actions summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      "## Source Staleness Report\n",
    ];

    if (changed.length > 0) {
      summary.push("### Changed Source URLs\n");
      summary.push("| URL | Affected Skills |");
      summary.push("|-----|-----------------|");
      for (const c of changed) {
        summary.push(`| ${c.url} | ${c.skills.join(", ")} |`);
      }
      summary.push("");
    }

    if (monorepoChanges.length > 0) {
      summary.push("### Sui Monorepo Changes\n");
      summary.push("| Skill | Path | Recent Commits |");
      summary.push("|-------|------|----------------|");
      for (const m of monorepoChanges) {
        const commitList = m.commits.slice(0, 3).map((c) => `\`${c.sha}\` ${c.message}`).join("<br>");
        summary.push(`| ${m.skill} | ${m.path} | ${commitList} |`);
      }
      summary.push("");
    }

    if (affectedSkills.size > 0) {
      summary.push(`\n**Skills needing review:** ${[...affectedSkills].join(", ")}`);
    } else if (errors.length === 0) {
      summary.push("All sources are up to date. ✅");
    }

    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join("\n"), { flag: "a" });
  }

  // Exit with failure if sources changed (in CI, not in update mode)
  if (!updateMode && (changed.length > 0 || monorepoChanges.length > 0)) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
