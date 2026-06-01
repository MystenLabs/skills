#!/usr/bin/env node

/**
 * Code Eval Runner
 *
 * Generates Move code via Claude, extracts it from the response,
 * creates temporary Move projects, and runs `sui move build` / `sui move test`
 * to verify the code compiles and tests pass.
 *
 * Usage:
 *   node scripts/run-code-evals.js                  # run all code evals
 *   node scripts/run-code-evals.js --changed-only   # run code evals for skills changed in this PR
 *   node scripts/run-code-evals.js --skill sui-move  # run code evals for a single skill
 *   node scripts/run-code-evals.js --concurrency 2  # parallel evals (default: 2)
 *   node scripts/run-code-evals.js --timeout 180000 # per-eval timeout in ms (default: 180000)
 *
 * Environment:
 *   ANTHROPIC_API_KEY   required
 *   EVAL_MODEL          model for generating code  (default: claude-opus-4-6)
 *   SUI_PATH            path to sui CLI            (default: auto-detect)
 */

import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from "fs";
import { resolve, dirname, basename, join } from "path";
import { execSync } from "child_process";
import { tmpdir } from "os";
import {
  ROOT,
  getFlag,
  hasFlag,
  Semaphore,
  withTimeout,
  discoverEvalFiles,
  loadSkillContext,
  parseEvals,
} from "./lib/utils.js";

// ── CLI args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const skillFlag = getFlag(args, "skill");
const concurrencyFlag = getFlag(args, "concurrency");
const timeoutFlag = getFlag(args, "timeout");
const suiPathFlag = getFlag(args, "sui-path");
const changedOnly = hasFlag(args, "changed-only");

const EVAL_MODEL = process.env.EVAL_MODEL ?? "claude-opus-4-6";
const MAX_TOKENS = 8192;
const CONCURRENCY = parseInt(concurrencyFlag ?? "2", 10);
const EVAL_TIMEOUT = parseInt(timeoutFlag ?? "180000", 10);
const BUILD_TIMEOUT = 120000; // 2 minutes for sui move build/test

const client = new Anthropic();

// ── Find sui CLI ─────────────────────────────────────────────────────
function findSuiCli() {
  if (suiPathFlag) return suiPathFlag;
  if (process.env.SUI_PATH) return process.env.SUI_PATH;

  // Try common locations
  const candidates = ["sui", join(process.env.HOME ?? "", ".local/bin/sui")];
  for (const candidate of candidates) {
    try {
      execSync(`${candidate} --version`, { encoding: "utf-8", stdio: "pipe" });
      return candidate;
    } catch { /* try next */ }
  }

  console.error("ERROR: sui CLI not found.");
  console.error("Install with: curl -fsSL https://sui.io/install.sh | bash");
  console.error("Or specify with: --sui-path /path/to/sui");
  process.exit(1);
}

// ── Version check ────────────────────────────────────────────────────
function checkSuiVersion(suiPath) {
  const raw = execSync(`${suiPath} --version`, { encoding: "utf-8" }).trim();
  const match = raw.match(/sui\s+(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    console.warn(`  Warning: Could not parse sui version from: ${raw}`);
    return { raw, major: 0, minor: 0, patch: 0 };
  }

  const [, major, minor, patch] = match;
  const parsed = { raw, major: parseInt(major), minor: parseInt(minor), patch: parseInt(patch) };

  if (parsed.minor < 63) {
    console.warn(`  WARNING: sui CLI ${raw} is below minimum 1.63.0`);
    console.warn(`  New package management format requires >= 1.63.0`);
    console.warn(`  Run: suiup update`);
  }

  return parsed;
}

// ── Extract Move code blocks from response ───────────────────────────
function extractMoveCode(text) {
  const blocks = [];

  // Match ```move ... ``` blocks
  const moveBlockRegex = /```move\s*\n([\s\S]*?)```/g;
  let match;
  while ((match = moveBlockRegex.exec(text)) !== null) {
    blocks.push(match[1].trim());
  }

  // Fallback: try generic ``` blocks that contain "module"
  if (blocks.length === 0) {
    const genericBlockRegex = /```\s*\n([\s\S]*?)```/g;
    while ((match = genericBlockRegex.exec(text)) !== null) {
      const content = match[1].trim();
      if (content.includes("module ")) {
        blocks.push(content);
      }
    }
  }

  // Split blocks that contain multiple module declarations
  const splitBlocks = [];
  for (const block of blocks) {
    const moduleStarts = [...block.matchAll(/^module\s+/gm)];
    if (moduleStarts.length > 1) {
      for (let i = 0; i < moduleStarts.length; i++) {
        const start = moduleStarts[i].index;
        const end = i + 1 < moduleStarts.length ? moduleStarts[i + 1].index : block.length;
        splitBlocks.push(block.slice(start, end).trim());
      }
    } else {
      splitBlocks.push(block);
    }
  }

  // Filter out blocks that don't contain a module declaration (stray usage examples)
  return splitBlocks.filter((b) => /module\s+\w+::\w+/.test(b));
}

// ── Route modules to source/test files ───────────────────────────────
function routeModulesToFiles(codeBlocks, packageName) {
  const files = [];
  for (const block of codeBlocks) {
    const moduleMatch = block.match(/module\s+(\w+)::(\w+)\s*[;{]/);
    const isTestModule =
      block.includes("#[test_only]") ||
      (moduleMatch && moduleMatch[2].endsWith("_tests"));

    const moduleName = moduleMatch ? moduleMatch[2] : `module_${files.length}`;
    const dir = isTestModule ? "tests" : "sources";

    // Normalize package name if it doesn't match
    let content = block;
    if (moduleMatch && moduleMatch[1] !== packageName) {
      content = block.replace(
        new RegExp(`module\\s+${moduleMatch[1]}::`, "g"),
        `module ${packageName}::`
      );
      // Also fix any use statements referencing the old package name
      content = content.replace(
        new RegExp(`use\\s+${moduleMatch[1]}::`, "g"),
        `use ${packageName}::`
      );
    }

    files.push({ path: `${dir}/${moduleName}.move`, content });
  }
  return files;
}

// ── Create temp Move project ─────────────────────────────────────────
function createTempProject(packageName, moduleFiles, extraSources) {
  const tmpDir = mkdtempSync(join(tmpdir(), "sui-code-eval-"));

  const moveToml = `[package]\nname = "${packageName}"\nedition = "2024"\n`;
  writeFileSync(join(tmpDir, "Move.toml"), moveToml);

  mkdirSync(join(tmpDir, "sources"), { recursive: true });
  mkdirSync(join(tmpDir, "tests"), { recursive: true });

  for (const { path, content } of moduleFiles) {
    writeFileSync(join(tmpDir, path), content);
  }

  for (const [filename, content] of Object.entries(extraSources ?? {})) {
    writeFileSync(join(tmpDir, "sources", filename), content);
  }

  return tmpDir;
}

function cleanupTempProject(tmpDir) {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}

// ── Run sui move command ─────────────────────────────────────────────
function runSuiCommand(suiPath, command, projectPath) {
  try {
    const stdout = execSync(`${suiPath} move ${command} --path ${projectPath}`, {
      encoding: "utf-8",
      timeout: BUILD_TIMEOUT,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { success: true, stdout, stderr: "" };
  } catch (err) {
    return {
      success: false,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message,
      exitCode: err.status,
    };
  }
}

// ── Evaluate build/test results ──────────────────────────────────────
function evaluateResult(buildResult, testResult, evalConfig) {
  const results = { build: null, test: null, overall: false };

  if (evalConfig.expected_result === "pass") {
    results.build = {
      pass: buildResult.success,
      detail: buildResult.success
        ? "Compilation succeeded"
        : `Compilation failed:\n${buildResult.stderr.slice(0, 500)}`,
    };
  } else {
    // Negative test: expect failure
    const errorMatched =
      !evalConfig.expected_error_pattern ||
      new RegExp(evalConfig.expected_error_pattern, "i").test(buildResult.stderr);
    results.build = {
      pass: !buildResult.success && errorMatched,
      detail: !buildResult.success
        ? errorMatched
          ? "Compilation failed as expected"
          : `Compilation failed but error did not match pattern "${evalConfig.expected_error_pattern}"`
        : "Compilation succeeded but was expected to fail",
    };
  }

  if (evalConfig.check === "test" && buildResult.success && evalConfig.expected_result === "pass") {
    results.test = {
      pass: testResult?.success ?? false,
      detail: testResult?.success
        ? "All tests passed"
        : `Tests failed:\n${(testResult?.stderr ?? "No test output").slice(0, 500)}`,
    };
  }

  results.overall =
    results.build.pass && (results.test === null || results.test.pass);

  return results;
}

// ── Generate code response ───────────────────────────────────────────
async function generateCode(skillContext, prompt, packageName) {
  const systemPrompt = `You are an expert Sui Move developer. Write complete, self-contained Sui Move code that compiles.

CRITICAL RULES:
- Use Move 2024 edition syntax: module declarations end with semicolon (module ${packageName}::name;), no outer braces
- The package name is "${packageName}" — use it in all module declarations
- Use "public struct" instead of "struct" for struct visibility (2024 edition requirement)
- Include all necessary imports (use statements)
- Write complete modules, not fragments
- Put code in \`\`\`move code blocks
- If writing tests, put them in a separate \`\`\`move block with #[test_only] attribute
- Do NOT use deprecated syntax: no "friend", no "public(friend)"

${skillContext}`;

  const response = await client.messages.create({
    model: EVAL_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

// ── Global semaphore ─────────────────────────────────────────────────
const evalSemaphore = new Semaphore(CONCURRENCY);

// ── Run all code evals for a single skill ────────────────────────────
async function runSkillCodeEvals(evalFile, suiPath) {
  const skillDir = basename(resolve(dirname(evalFile), ".."));
  const evals = parseEvals(evalFile);
  const skillContext = loadSkillContext(evalFile);

  const results = await Promise.all(
    evals.map(async (ev) => {
      const evalId = ev.id ?? `${skillDir}-code-${evals.indexOf(ev)}`;
      const packageName = ev.package_name ?? "test_project";

      await evalSemaphore.acquire();
      let tmpDir = null;
      try {
        const work = async () => {
          // 1. Generate code
          const response = await generateCode(skillContext, ev.prompt, packageName);

          // 2. Extract code blocks
          const codeBlocks = extractMoveCode(response);
          if (codeBlocks.length === 0) {
            return {
              response,
              status: "ERROR",
              error: "No Move code blocks found in response",
              buildResult: null,
              testResult: null,
              evaluation: null,
              moduleCount: 0,
            };
          }

          // 3. Route to files
          const moduleFiles = routeModulesToFiles(codeBlocks, packageName);

          // 4. Create temp project
          tmpDir = createTempProject(packageName, moduleFiles, ev.extra_sources);

          // 5. Build
          const buildResult = runSuiCommand(suiPath, "build", tmpDir);

          // 6. Test (if requested and build passed)
          let testResult = null;
          if (ev.check === "test" && buildResult.success) {
            testResult = runSuiCommand(suiPath, "test", tmpDir);
          }

          // 7. Evaluate
          const evaluation = evaluateResult(buildResult, testResult, ev);

          return {
            response,
            status: evaluation.overall ? "PASS" : "FAIL",
            error: null,
            buildResult,
            testResult,
            evaluation,
            moduleCount: moduleFiles.length,
          };
        };

        const result = await withTimeout(work(), EVAL_TIMEOUT, evalId);

        return {
          result: {
            skill: skillDir,
            eval_id: evalId,
            status: result.status,
            check: ev.check,
            expected_result: ev.expected_result,
            build: result.evaluation?.build ?? null,
            test: result.evaluation?.test ?? null,
            code_extracted: result.moduleCount > 0,
            module_count: result.moduleCount,
            response_excerpt: result.response.slice(0, 200),
            error: result.error,
          },
          pass: result.status === "PASS",
        };
      } catch (err) {
        return {
          result: {
            skill: skillDir,
            eval_id: evalId,
            status: "ERROR",
            error: err.message.slice(0, 300),
          },
          pass: false,
        };
      } finally {
        if (tmpDir) cleanupTempProject(tmpDir);
        evalSemaphore.release();
      }
    })
  );

  // Print results
  console.log(`\n━━ ${skillDir} (${evals.length} code evals) ━━`);
  for (const { result } of results) {
    if (result.status === "ERROR") {
      console.log(`  ${result.eval_id} ... ERROR: ${result.error}`);
    } else {
      const parts = [result.eval_id, "...", result.status];
      if (result.build) parts.push(`[build: ${result.build.pass ? "ok" : "FAIL"}]`);
      if (result.test) parts.push(`[test: ${result.test.pass ? "ok" : "FAIL"}]`);
      console.log(`  ${parts.join(" ")}`);
      if (result.status === "FAIL") {
        if (result.build && !result.build.pass) {
          console.log(`    build: ${result.build.detail.split("\n")[0]}`);
        }
        if (result.test && !result.test.pass) {
          console.log(`    test: ${result.test.detail.split("\n")[0]}`);
        }
      }
    }
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  // 1. Find and check sui CLI
  const suiPath = findSuiCli();
  const version = checkSuiVersion(suiPath);

  // 2. Discover code eval files
  const evalFiles = discoverEvalFiles("code-evals.json", {
    skillFilter: skillFlag,
    changedOnly,
  });

  if (evalFiles.length === 0) {
    console.log("No code eval files to run.");
    process.exit(0);
  }

  console.log(`\nCode eval runner configuration:`);
  console.log(`  Sui CLI        : ${version.raw}`);
  console.log(`  Move edition   : 2024`);
  console.log(`  Response model : ${EVAL_MODEL}`);
  console.log(`  Concurrency    : ${CONCURRENCY} evals in parallel`);
  console.log(`  Eval timeout   : ${EVAL_TIMEOUT}ms`);
  console.log(`  Eval files     : ${evalFiles.length}\n`);

  // 3. Run all code evals
  const allSkillResults = await Promise.all(
    evalFiles.map((f) => runSkillCodeEvals(f, suiPath))
  );

  const allResults = [];
  let totalPass = 0;
  let totalFail = 0;
  let totalEvals = 0;

  for (const skillResults of allSkillResults) {
    for (const { result, pass } of skillResults) {
      allResults.push(result);
      if (pass) totalPass++;
      else totalFail++;
      totalEvals++;
    }
  }

  // 4. Summary
  console.log(`\n${"═".repeat(60)}`);
  console.log(`RESULTS: ${totalEvals} code evals, ${totalPass} passed, ${totalFail} failed`);
  console.log(`${"═".repeat(60)}\n`);

  // 5. Write results JSON
  const outPath = join(ROOT, "scripts", "code-eval-results.json");
  writeFileSync(outPath, JSON.stringify(allResults, null, 2));
  console.log(`Full results written to ${outPath}`);

  // 6. GitHub Actions summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      "## Code Eval Results\n",
      `| Skill | Eval | Check | Status | Build | Test |`,
      `|-------|------|-------|--------|-------|------|`,
      ...allResults.map(
        (r) =>
          `| ${r.skill} | ${r.eval_id} | ${r.check ?? "-"} | ${r.status === "PASS" ? "✅" : "❌"} ${r.status} | ${r.build?.pass ? "✅" : r.build ? "❌" : "-"} | ${r.test?.pass ? "✅" : r.test ? "❌" : "-"} |`
      ),
      "",
      `**Sui CLI: ${version.raw}**`,
      `**Total: ${totalPass} passed, ${totalFail} failed across ${totalEvals} code evals**`,
    ].join("\n");

    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: "a" });
  }

  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
