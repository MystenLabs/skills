#!/usr/bin/env node

/**
 * Skill Impact Comparison
 *
 * Compares AgentPrompt eval results with and without skills loaded
 * to measure how much skills improve response quality.
 *
 * Usage:
 *   node scripts/compare-skill-impact.js \
 *     --baseline scripts/agent-prompt-eval-results.json \
 *     --enhanced scripts/agent-prompt-with-skills-eval-results.json
 *
 *   node scripts/compare-skill-impact.js --artifacts-dir artifacts
 *     (auto-discovers matching baseline/enhanced pairs by model label)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

import { ROOT, getFlag } from "./lib/utils.js";

const args = process.argv.slice(2);
const baselineFile = getFlag(args, "baseline");
const enhancedFile = getFlag(args, "enhanced");
const artifactsDir = getFlag(args, "artifacts-dir");

// ── Discover result pairs ────────────────────────────────────────────
// Either explicit files or auto-discover from artifacts directory
const pairs = []; // { label, baseline: [...results], enhanced: [...results] }

if (baselineFile && enhancedFile) {
  const baseline = JSON.parse(readFileSync(baselineFile, "utf-8"));
  const enhanced = JSON.parse(readFileSync(enhancedFile, "utf-8"));
  pairs.push({ label: "default", baseline, enhanced });
} else if (artifactsDir) {
  // Auto-discover: match agent-prompt-results-{label} with agent-prompt-with-skills-results-{label}
  const dirs = readdirSync(artifactsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const baselineDirs = dirs.filter((d) => d.startsWith("agent-prompt-results-"));
  for (const bd of baselineDirs) {
    const label = bd.replace("agent-prompt-results-", "");
    const ed = `agent-prompt-with-skills-results-${label}`;

    const bFile = join(artifactsDir, bd, "agent-prompt-eval-results.json");
    const eFile = join(artifactsDir, ed, "agent-prompt-with-skills-eval-results.json");

    if (existsSync(bFile) && existsSync(eFile)) {
      pairs.push({
        label,
        baseline: JSON.parse(readFileSync(bFile, "utf-8")),
        enhanced: JSON.parse(readFileSync(eFile, "utf-8")),
      });
    }
  }
} else {
  // Default: look for files in scripts/
  const bPath = join(ROOT, "scripts", "agent-prompt-eval-results.json");
  const ePath = join(ROOT, "scripts", "agent-prompt-with-skills-eval-results.json");
  if (existsSync(bPath) && existsSync(ePath)) {
    pairs.push({
      label: "default",
      baseline: JSON.parse(readFileSync(bPath, "utf-8")),
      enhanced: JSON.parse(readFileSync(ePath, "utf-8")),
    });
  }
}

if (pairs.length === 0) {
  console.error("No baseline/enhanced result pairs found.");
  console.error("Usage: --baseline <file> --enhanced <file>  OR  --artifacts-dir <dir>");
  process.exit(1);
}

// ── Compare one pair ─────────────────────────────────────────────────
function comparePair(baseline, enhanced) {
  const bLookup = Object.fromEntries(baseline.map((r) => [r.id, r]));
  const eLookup = Object.fromEntries(enhanced.map((r) => [r.id, r]));

  const allIds = [...new Set([...baseline.map((r) => r.id), ...enhanced.map((r) => r.id)])].sort();

  const prompts = [];
  let improved = 0, unchanged = 0, regressed = 0;
  let totalBaselinePassed = 0, totalBaselineTotal = 0;
  let totalEnhancedPassed = 0, totalEnhancedTotal = 0;

  for (const id of allIds) {
    const b = bLookup[id];
    const e = eLookup[id];

    if (!b || !e) {
      prompts.push({ id, outcome: "missing", note: b ? "no enhanced result" : "no baseline result" });
      continue;
    }

    // Skip errored results
    if (b.status === "ERROR" || e.status === "ERROR") {
      prompts.push({
        id, outcome: "error",
        baseline_error: b.status === "ERROR" ? b.error : null,
        enhanced_error: e.status === "ERROR" ? e.error : null,
      });
      continue;
    }

    const bPassed = b.passed ?? 0;
    const bTotal = b.total ?? 0;
    const ePassed = e.passed ?? 0;
    const eTotal = e.total ?? 0;

    totalBaselinePassed += bPassed;
    totalBaselineTotal += bTotal;
    totalEnhancedPassed += ePassed;
    totalEnhancedTotal += eTotal;

    const delta = ePassed - bPassed;
    let outcome;
    if (delta > 0) { outcome = "improved"; improved++; }
    else if (delta < 0) { outcome = "regressed"; regressed++; }
    else { outcome = "unchanged"; unchanged++; }

    const prompt = {
      id,
      source_page: b.source_page ?? e.source_page,
      skills_loaded: e.skills_loaded ?? [],
      baseline: { passed: bPassed, total: bTotal, rate: bTotal > 0 ? (bPassed / bTotal) : 0 },
      enhanced: { passed: ePassed, total: eTotal, rate: eTotal > 0 ? (ePassed / eTotal) : 0 },
      delta,
      outcome,
    };

    // Detail which checks changed
    const detChanges = [];
    const bDet = b.deterministic_results ?? [];
    const eDet = e.deterministic_results ?? [];
    for (let i = 0; i < Math.max(bDet.length, eDet.length); i++) {
      if (bDet[i] && eDet[i] && bDet[i].pass !== eDet[i].pass) {
        detChanges.push({
          check: eDet[i].value,
          was: bDet[i].pass,
          now: eDet[i].pass,
        });
      }
    }
    if (detChanges.length > 0) prompt.deterministic_changes = detChanges;

    const subjChanges = [];
    const bSubj = b.subjective_grades ?? [];
    const eSubj = e.subjective_grades ?? [];
    for (let i = 0; i < Math.max(bSubj.length, eSubj.length); i++) {
      if (bSubj[i] && eSubj[i] && bSubj[i].pass !== eSubj[i].pass) {
        subjChanges.push({
          expectation: eSubj[i].expectation,
          was: bSubj[i].pass,
          now: eSubj[i].pass,
        });
      }
    }
    if (subjChanges.length > 0) prompt.subjective_changes = subjChanges;

    prompts.push(prompt);
  }

  return {
    prompts_compared: improved + unchanged + regressed,
    improved,
    unchanged,
    regressed,
    baseline_rate: totalBaselineTotal > 0 ? totalBaselinePassed / totalBaselineTotal : 0,
    enhanced_rate: totalEnhancedTotal > 0 ? totalEnhancedPassed / totalEnhancedTotal : 0,
    delta_rate: totalBaselineTotal > 0 ? (totalEnhancedPassed / totalEnhancedTotal) - (totalBaselinePassed / totalBaselineTotal) : 0,
    prompts,
  };
}

// ── Generate report ──────────────────────────────────────────────────
const lines = [];
lines.push("# Skill Impact Analysis\n");
lines.push("Compares AgentPrompt responses **with skills loaded** vs **baseline (no skills)**.\n");

const allComparisons = {};

for (const { label, baseline, enhanced } of pairs) {
  const comparison = comparePair(baseline, enhanced);
  allComparisons[label] = comparison;

  const pct = (n) => `${Math.round(n * 100)}%`;

  lines.push(`## ${label}\n`);
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Prompts compared | ${comparison.prompts_compared} |`);
  lines.push(`| Improved | ${comparison.improved} |`);
  lines.push(`| Unchanged | ${comparison.unchanged} |`);
  lines.push(`| Regressed | ${comparison.regressed} |`);
  lines.push(`| Baseline pass rate | ${pct(comparison.baseline_rate)} |`);
  lines.push(`| With-skills pass rate | ${pct(comparison.enhanced_rate)} |`);
  lines.push(`| Improvement | ${comparison.delta_rate >= 0 ? "+" : ""}${pct(comparison.delta_rate)} |`);
  lines.push("");

  // Per-prompt table
  lines.push("| Prompt | Skills | Baseline | With Skills | Delta | Outcome |");
  lines.push("|--------|--------|:--------:|:-----------:|:-----:|:-------:|");

  for (const p of comparison.prompts) {
    if (p.outcome === "missing" || p.outcome === "error") {
      lines.push(`| ${p.id} | – | – | – | – | ${p.outcome} |`);
      continue;
    }
    const skills = (p.skills_loaded ?? []).join(", ") || "–";
    const bScore = `${p.baseline.passed}/${p.baseline.total}`;
    const eScore = `${p.enhanced.passed}/${p.enhanced.total}`;
    const delta = p.delta > 0 ? `+${p.delta}` : p.delta === 0 ? "0" : `${p.delta}`;
    const icon = p.outcome === "improved" ? "📈" : p.outcome === "regressed" ? "📉" : "➡️";
    lines.push(`| ${p.id} | ${skills} | ${bScore} | ${eScore} | ${delta} | ${icon} ${p.outcome} |`);
  }
  lines.push("");

  // Detail changes
  const changed = comparison.prompts.filter((p) => p.outcome !== "unchanged" && p.outcome !== "missing" && p.outcome !== "error");
  if (changed.length > 0) {
    lines.push("### What changed\n");
    for (const p of changed) {
      lines.push(`**${p.id}** (${p.outcome}):`);
      for (const c of p.deterministic_changes ?? []) {
        const icon = c.now ? "✅ fixed" : "❌ broke";
        lines.push(`- [det] \`${c.check}\`: ${icon}`);
      }
      for (const c of p.subjective_changes ?? []) {
        const icon = c.now ? "✅ fixed" : "❌ broke";
        lines.push(`- [subj] ${c.expectation}: ${icon}`);
      }
      lines.push("");
    }
  }
}

const report = lines.join("\n");
console.log(report);

// Write JSON output
const outPath = join(ROOT, "scripts", "skill-impact-report.json");
writeFileSync(outPath, JSON.stringify(allComparisons, null, 2));
console.log(`\nJSON report written to ${outPath}`);

// GitHub Actions summary
if (process.env.GITHUB_STEP_SUMMARY) {
  writeFileSync(process.env.GITHUB_STEP_SUMMARY, report, { flag: "a" });
}

// GitHub Actions output
if (process.env.GITHUB_OUTPUT) {
  const anyRegressed = Object.values(allComparisons).some((c) => c.regressed > 0);
  writeFileSync(process.env.GITHUB_OUTPUT, `has_regressions=${anyRegressed}\n`, { flag: "a" });
}
