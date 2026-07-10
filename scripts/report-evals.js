#!/usr/bin/env node

/**
 * Eval Report Generator -- merges results from multiple model runs into
 * a detailed comparison report. Used by the CI 'report' job.
 *
 * Usage:
 *   node scripts/report-evals.js <artifact-dir>
 *
 * Expects subdirectories like:
 *   <artifact-dir>/eval-results-sonnet/eval-results.json
 *   <artifact-dir>/eval-results-opus/eval-results.json
 *   <artifact-dir>/code-eval-results/code-eval-results.json
 *   <artifact-dir>/agent-prompt-results-sonnet/agent-prompt-eval-results.json
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";

const artifactDir = process.argv[2];
if (!artifactDir) {
  console.error("Usage: node scripts/report-evals.js <artifact-dir>");
  process.exit(1);
}

// ── Discover result files ────────────────────────────────────────────
const modelResults = {};
const codeResults = [];
const agentPromptResults = {};
const agentPromptWithSkillsResults = {};
let hasFailures = false;

for (const dir of readdirSync(artifactDir, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const subDir = join(artifactDir, dir.name);

  const evalFile = join(subDir, "eval-results.json");
  if (existsSync(evalFile)) {
    const label = dir.name.replace("eval-results-", "");
    const results = JSON.parse(readFileSync(evalFile, "utf-8"));
    modelResults[label] = results;
    if (results.some((r) => r.status !== "PASS")) hasFailures = true;
  }

  const codeEvalFile = join(subDir, "code-eval-results.json");
  if (existsSync(codeEvalFile)) {
    const results = JSON.parse(readFileSync(codeEvalFile, "utf-8"));
    codeResults.push(...results);
    if (results.some((r) => r.status !== "PASS")) hasFailures = true;
  }

  const agentPromptFile = join(subDir, "agent-prompt-eval-results.json");
  if (existsSync(agentPromptFile)) {
    const label = dir.name.replace("agent-prompt-results-", "");
    const results = JSON.parse(readFileSync(agentPromptFile, "utf-8"));
    agentPromptResults[label] = results;
    if (results.some((r) => r.status !== "PASS")) hasFailures = true;
  }

  const agentPromptWithSkillsFile = join(subDir, "agent-prompt-with-skills-eval-results.json");
  if (existsSync(agentPromptWithSkillsFile)) {
    const label = dir.name.replace("agent-prompt-with-skills-results-", "");
    const results = JSON.parse(readFileSync(agentPromptWithSkillsFile, "utf-8"));
    agentPromptWithSkillsResults[label] = results;
    if (results.some((r) => r.status !== "PASS")) hasFailures = true;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────
const models = Object.keys(modelResults).sort();
const agentModels = Object.keys(agentPromptResults).sort();
const agentWithSkillsModels = Object.keys(agentPromptWithSkillsResults).sort();

if (models.length === 0 && codeResults.length === 0 && agentModels.length === 0 && agentWithSkillsModels.length === 0) {
  console.log("No eval results found.");
  process.exit(0);
}

function pct(n, d) {
  if (d === 0) return "–";
  return `${Math.round((n / d) * 100)}%`;
}

function statusIcon(status) {
  if (status === "PASS") return "✅";
  if (status === "ERROR") return "⚠️";
  return "❌";
}

function countChecks(results, field) {
  let passed = 0, total = 0;
  for (const r of results) {
    const items = r[field];
    if (!items) continue;
    for (const item of items) {
      total++;
      if (item.pass) passed++;
    }
  }
  return { passed, total };
}

// ── Generate markdown report ─────────────────────────────────────────
const lines = [];
lines.push("# Eval Report\n");

// ── Executive summary ────────────────────────────────────────────────
lines.push("## Executive Summary\n");

const summaryRows = [];
for (const model of models) {
  const results = modelResults[model];
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const err = results.filter((r) => r.status === "ERROR").length;
  const flaky = results.filter((r) => r.flaky).length;
  const grades = results.flatMap((r) => r.grades ?? r.subjective_grades ?? []);
  const gradePass = grades.filter((g) => g.pass).length;
  const det = countChecks(results, "deterministic_results");
  summaryRows.push({
    label: `Skill evals (${model})`,
    evals: results.length, pass, fail, err, flaky,
    checks: gradePass + det.passed,
    checksTotal: grades.length + det.total,
  });
}

for (const model of agentModels) {
  const results = agentPromptResults[model];
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const err = results.filter((r) => r.status === "ERROR").length;
  const flaky = results.filter((r) => r.flaky).length;
  const subj = countChecks(results, "subjective_grades");
  const det = countChecks(results, "deterministic_results");
  summaryRows.push({
    label: `AgentPrompt baseline (${model})`,
    evals: results.length, pass, fail, err, flaky,
    checks: subj.passed + det.passed,
    checksTotal: subj.total + det.total,
  });
}

for (const model of agentWithSkillsModels) {
  const results = agentPromptWithSkillsResults[model];
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const err = results.filter((r) => r.status === "ERROR").length;
  const flaky = results.filter((r) => r.flaky).length;
  const subj = countChecks(results, "subjective_grades");
  const det = countChecks(results, "deterministic_results");
  summaryRows.push({
    label: `AgentPrompt +skills (${model})`,
    evals: results.length, pass, fail, err, flaky,
    checks: subj.passed + det.passed,
    checksTotal: subj.total + det.total,
  });
}

if (codeResults.length > 0) {
  const pass = codeResults.filter((r) => r.status === "PASS").length;
  const fail = codeResults.filter((r) => r.status === "FAIL").length;
  const err = codeResults.filter((r) => r.status === "ERROR").length;
  summaryRows.push({
    label: "Code evals",
    evals: codeResults.length, pass, fail, err, flaky: 0,
    checks: pass, checksTotal: codeResults.length,
  });
}

lines.push("| Suite | Evals | Pass | Fail | Err | Flaky | Checks | Rate |");
lines.push("|-------|------:|-----:|-----:|----:|------:|-------:|-----:|");
for (const s of summaryRows) {
  lines.push(
    `| ${s.label} | ${s.evals} | ${s.pass} | ${s.fail} | ${s.err} | ${s.flaky || "–"} | ${s.checks}/${s.checksTotal} | ${pct(s.checks, s.checksTotal)} |`
  );
}
lines.push("");

// ── Knowledge evals detail ───────────────────────────────────────────
if (models.length > 0) {
  lines.push("---\n");
  lines.push("## Knowledge Evals\n");

  // Comparison table
  const header = `| Skill | Eval | ${models.map((m) => `${m}`).join(" | ")} |`;
  const sep = `|-------|------|${models.map(() => ":------:").join("|")}|`;
  lines.push(header);
  lines.push(sep);

  const allEvalIds = new Set();
  for (const results of Object.values(modelResults)) {
    for (const r of results) allEvalIds.add(`${r.skill}/${r.eval_id}`);
  }
  const lookup = {};
  for (const [model, results] of Object.entries(modelResults)) {
    lookup[model] = {};
    for (const r of results) lookup[model][`${r.skill}/${r.eval_id}`] = r;
  }

  for (const key of [...allEvalIds].sort()) {
    const [skill, evalId] = [key.split("/")[0], key.split("/").slice(1).join("/")];
    const cells = models.map((m) => {
      const r = lookup[m]?.[key];
      if (!r) return "–";
      const icon = statusIcon(r.status);
      const score = r.total ? ` ${r.passed}/${r.total}` : "";
      const flaky = r.flaky ? " 🔄" : "";
      return `${icon}${score}${flaky}`;
    });
    lines.push(`| ${skill} | ${evalId} | ${cells.join(" | ")} |`);
  }
  lines.push("");

  // Per-model breakdown
  lines.push("### Per-Model Breakdown\n");
  for (const model of models) {
    const results = modelResults[model];
    const pass = results.filter((r) => r.status === "PASS").length;
    const fail = results.filter((r) => r.status !== "PASS").length;
    const flaky = results.filter((r) => r.flaky).length;
    const det = countChecks(results, "deterministic_results");
    const grades = results.flatMap((r) => r.grades ?? r.subjective_grades ?? []);
    const gradePass = grades.filter((g) => g.pass).length;

    lines.push(`<details><summary><b>${model}</b>: ${pass}/${results.length} evals passed (${pct(pass, results.length)})</summary>\n`);
    lines.push(`- Deterministic checks: ${det.passed}/${det.total} (${pct(det.passed, det.total)})`);
    lines.push(`- Subjective grades: ${gradePass}/${grades.length} (${pct(gradePass, grades.length)})`);
    if (flaky > 0) lines.push(`- Flaky evals: ${flaky}`);
    lines.push("");

    // Show each eval with details
    for (const r of results) {
      const icon = statusIcon(r.status);
      lines.push(`#### ${icon} ${r.eval_id}\n`);
      if (r.response_excerpt) {
        lines.push(`> ${r.response_excerpt.replace(/\n/g, " ").slice(0, 200)}...\n`);
      }

      // Deterministic results
      const detResults = r.deterministic_results ?? [];
      if (detResults.length > 0) {
        lines.push("**Deterministic checks:**");
        for (const d of detResults) {
          const check = d.pass ? "✅" : "❌";
          lines.push(`- ${check} \`${d.type}\`: ${d.detail}`);
        }
        lines.push("");
      }

      // Subjective grades
      const subjGrades = r.grades ?? r.subjective_grades ?? [];
      if (subjGrades.length > 0) {
        lines.push("**Subjective grades:**");
        for (const g of subjGrades) {
          const check = g.pass ? "✅" : "❌";
          const rate = g.pass_rate ? ` (${g.pass_rate})` : "";
          const flakyTag = g.flaky ? " 🔄" : "";
          lines.push(`- ${check} ${g.expectation}${rate}${flakyTag}`);
          lines.push(`  - _${g.reason}_`);
        }
        lines.push("");
      }

      if (r.error) {
        lines.push(`**Error:** \`${r.error}\`\n`);
      }
    }
    lines.push("</details>\n");
  }
}

// ── Code evals detail ────────────────────────────────────────────────
if (codeResults.length > 0) {
  lines.push("---\n");
  lines.push("## Code Evals\n");

  lines.push("| Skill | Eval | Check | Expected | Build | Test | Status |");
  lines.push("|-------|------|-------|----------|-------|------|:------:|");
  for (const r of codeResults) {
    const icon = statusIcon(r.status);
    const buildIcon = r.build ? (r.build.pass ? "✅" : "❌") : "–";
    const testIcon = r.test ? (r.test.pass ? "✅" : "❌") : "–";
    lines.push(
      `| ${r.skill} | ${r.eval_id} | ${r.check ?? "–"} | ${r.expected_result ?? "–"} | ${buildIcon} | ${testIcon} | ${icon} |`
    );
  }
  lines.push("");

  // Code eval failure details
  const codeFails = codeResults.filter((r) => r.status !== "PASS");
  if (codeFails.length > 0) {
    lines.push("### Code Eval Failures\n");
    for (const r of codeFails) {
      lines.push(`<details><summary><b>${r.skill} / ${r.eval_id}</b> — ${r.status}</summary>\n`);
      if (r.response_excerpt) {
        lines.push(`> ${r.response_excerpt.replace(/\n/g, " ").slice(0, 200)}...\n`);
      }
      if (r.build && !r.build.pass) {
        lines.push("**Build output:**");
        lines.push("```");
        lines.push(r.build.detail.slice(0, 1500));
        lines.push("```\n");
      }
      if (r.test && !r.test.pass) {
        lines.push("**Test output:**");
        lines.push("```");
        lines.push(r.test.detail.slice(0, 1500));
        lines.push("```\n");
      }
      if (r.error) {
        lines.push(`**Error:** \`${r.error}\`\n`);
      }
      lines.push(`Modules extracted: ${r.module_count ?? 0}\n`);
      lines.push("</details>\n");
    }
  }
}

// ── AgentPrompt evals detail ─────────────────────────────────────────
if (agentModels.length > 0) {
  lines.push("---\n");
  lines.push("## AgentPrompt Evals (docs.sui.io)\n");

  // Collect all unique prompt IDs
  const allPromptIds = new Set();
  for (const results of Object.values(agentPromptResults)) {
    for (const r of results) allPromptIds.add(r.id);
  }

  const apLookup = {};
  for (const [model, results] of Object.entries(agentPromptResults)) {
    apLookup[model] = {};
    for (const r of results) apLookup[model][r.id] = r;
  }

  // Comparison table
  const apHeader = `| Prompt | Source Page | ${agentModels.join(" | ")} |`;
  const apSep = `|--------|-----------|${agentModels.map(() => ":------:").join("|")}|`;
  lines.push(apHeader);
  lines.push(apSep);

  for (const id of [...allPromptIds].sort()) {
    const firstResult = Object.values(agentPromptResults)
      .flat()
      .find((r) => r.id === id);
    const page = firstResult?.source_page ?? "–";

    const cells = agentModels.map((m) => {
      const r = apLookup[m]?.[id];
      if (!r) return "–";
      const icon = statusIcon(r.status);
      const score = r.total ? ` ${r.passed}/${r.total}` : "";
      const flaky = r.flaky ? " 🔄" : "";
      return `${icon}${score}${flaky}`;
    });
    lines.push(`| ${id} | ${page} | ${cells.join(" | ")} |`);
  }
  lines.push("");

  // Per-model detail
  lines.push("### Per-Model Detail\n");
  for (const model of agentModels) {
    const results = agentPromptResults[model];
    const pass = results.filter((r) => r.status === "PASS").length;
    const fail = results.filter((r) => r.status !== "PASS").length;
    const det = countChecks(results, "deterministic_results");
    const subj = countChecks(results, "subjective_grades");

    lines.push(`<details><summary><b>${model}</b>: ${pass}/${results.length} prompts passed (${pct(pass, results.length)})</summary>\n`);
    lines.push(`- Deterministic checks: ${det.passed}/${det.total} (${pct(det.passed, det.total)})`);
    lines.push(`- Subjective grades: ${subj.passed}/${subj.total} (${pct(subj.passed, subj.total)})`);
    lines.push("");

    for (const r of results) {
      const icon = statusIcon(r.status);
      lines.push(`#### ${icon} ${r.id}`);
      lines.push(`**Page:** ${r.source_page ?? "unknown"}\n`);

      if (r.response_excerpt) {
        lines.push(`> ${r.response_excerpt.replace(/\n/g, " ").slice(0, 250)}...\n`);
      }

      const detResults = r.deterministic_results ?? [];
      if (detResults.length > 0) {
        lines.push("**Deterministic checks:**");
        for (const d of detResults) {
          lines.push(`- ${d.pass ? "✅" : "❌"} \`${d.type}\`: ${d.detail}`);
        }
        lines.push("");
      }

      const subjGrades = r.subjective_grades ?? [];
      if (subjGrades.length > 0) {
        lines.push("**Subjective grades:**");
        for (const g of subjGrades) {
          const check = g.pass ? "✅" : "❌";
          const rate = g.pass_rate ? ` (${g.pass_rate})` : "";
          const flakyTag = g.flaky ? " 🔄" : "";
          lines.push(`- ${check} ${g.expectation}${rate}${flakyTag}`);
          lines.push(`  - _${g.reason}_`);
        }
        lines.push("");
      }

      if (r.error) {
        lines.push(`**Error:** \`${r.error}\`\n`);
      }
    }
    lines.push("</details>\n");
  }
}

// ── Cross-model disagreements ────────────────────────────────────────
const disagreements = [];

// Knowledge eval disagreements
if (models.length > 1) {
  const allEvalIds = new Set();
  for (const results of Object.values(modelResults)) {
    for (const r of results) allEvalIds.add(`${r.skill}/${r.eval_id}`);
  }
  const lookup = {};
  for (const [model, results] of Object.entries(modelResults)) {
    lookup[model] = {};
    for (const r of results) lookup[model][`${r.skill}/${r.eval_id}`] = r;
  }

  for (const key of [...allEvalIds].sort()) {
    const statuses = models.map((m) => lookup[m]?.[key]?.status).filter(Boolean);
    if (statuses.length > 1 && new Set(statuses).size > 1) {
      const detail = models
        .map((m) => `${m}: ${lookup[m]?.[key]?.status ?? "–"}`)
        .join(", ");
      disagreements.push(`- **${key}**: ${detail}`);
    }
  }
}

// AgentPrompt disagreements
if (agentModels.length > 1) {
  const allIds = new Set();
  for (const results of Object.values(agentPromptResults)) {
    for (const r of results) allIds.add(r.id);
  }
  const apLookup = {};
  for (const [model, results] of Object.entries(agentPromptResults)) {
    apLookup[model] = {};
    for (const r of results) apLookup[model][r.id] = r;
  }

  for (const id of [...allIds].sort()) {
    const statuses = agentModels.map((m) => apLookup[m]?.[id]?.status).filter(Boolean);
    if (statuses.length > 1 && new Set(statuses).size > 1) {
      const detail = agentModels
        .map((m) => `${m}: ${apLookup[m]?.[id]?.status ?? "–"}`)
        .join(", ");
      disagreements.push(`- **AgentPrompt: ${id}**: ${detail}`);
    }
  }
}

if (disagreements.length > 0) {
  lines.push("---\n");
  lines.push("## Cross-Model Disagreements\n");
  lines.push("These evals passed on some models but failed on others:\n");
  lines.push(...disagreements);
  lines.push("");
}

// ── Final output ─────────────────────────────────────────────────────
const report = lines.join("\n");
console.log(report);

writeFileSync(join(artifactDir, "report.md"), report);

if (process.env.GITHUB_STEP_SUMMARY) {
  writeFileSync(process.env.GITHUB_STEP_SUMMARY, report, { flag: "a" });
}

if (process.env.GITHUB_OUTPUT) {
  writeFileSync(process.env.GITHUB_OUTPUT, `has_failures=${hasFailures}\n`, {
    flag: "a",
  });
}

process.exit(hasFailures ? 1 : 0);
