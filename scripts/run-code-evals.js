#!/usr/bin/env node

/**
 * Code Eval Runner
 *
 * Generates code via Claude, then builds/tests Move or strictly typechecks
 * TypeScript/TSX. TypeScript sources are never executed.
 *
 * Usage:
 *   node scripts/run-code-evals.js                  # run all code evals
 *   node scripts/run-code-evals.js --changed-only   # run code evals for skills changed in this PR
 *   node scripts/run-code-evals.js --skill sui-move  # run code evals for a single skill
 *   node scripts/run-code-evals.js --concurrency 2  # parallel evals (default: 2)
 *   node scripts/run-code-evals.js --timeout 180000 # per-eval timeout in ms (default: 180000)
 *   node scripts/run-code-evals.js --language tsx   # frontend typechecking only
 *   node scripts/run-code-evals.js --skill ptbs --responses responses.json # offline
 *   See scripts/CODE-EVALS.md for dependencies and response file format.
 *
 * Environment:
 *   ANTHROPIC_API_KEY   required unless --responses is supplied
 *   EVAL_MODEL          model for generating code  (default: claude-opus-4-6)
 *   SUI_PATH            path to sui CLI            (default: auto-detect)
 */

import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, readFileSync, mkdirSync, mkdtempSync, rmSync } from "fs";
import { resolve, dirname, basename, join } from "path";
import { execFile, execFileSync } from "child_process";
import { tmpdir } from "os";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { assertTypeScriptDependencies, checkTypeScript } from "./lib/typescript-check.js";
import {
  ROOT,
  getFlag,
  hasFlag,
  Semaphore,
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
const languageFlag = getFlag(args, "language");
const responsesFlag = getFlag(args, "responses");
const outputFlag = getFlag(args, "output");

const EVAL_MODEL = process.env.EVAL_MODEL ?? "claude-opus-4-6";
const MAX_TOKENS = 8192;
const CONCURRENCY = Number(concurrencyFlag ?? "2");
const EVAL_TIMEOUT = Number(timeoutFlag ?? "180000");
const BUILD_TIMEOUT = 120000; // 2 minutes for sui move build/test
const execSui = promisify(execFile);

let client;
let offlineResponses;

export function evalLanguage(ev) {
  const language = ev.language ?? "move";
  if (!["move", "typescript", "tsx"].includes(language)) throw new Error(`Unsupported eval language: ${language}`);
  if (language !== "move" && ev.check !== "build") throw new Error(`${language} supports check: build (typecheck) only`);
  return language;
}

function selectedEvals(evalFile) {
  return parseEvals(evalFile).filter((ev) => !languageFlag || evalLanguage(ev) === languageFlag);
}

// ── Find sui CLI ─────────────────────────────────────────────────────
function findSuiCli() {
  if (suiPathFlag) return suiPathFlag;
  if (process.env.SUI_PATH) return process.env.SUI_PATH;

  // Try common locations
  const candidates = ["sui", join(process.env.HOME ?? "", ".local/bin/sui")];
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ["--version"], { encoding: "utf-8", stdio: "pipe", timeout: 5000 });
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
  const raw = execFileSync(suiPath, ["--version"], { encoding: "utf-8", timeout: 5000 }).trim();
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
export function extractMoveCode(text) {
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
export function routeModulesToFiles(codeBlocks, packageName) {
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
async function runSuiCommand(suiPath, command, projectPath, timeout = BUILD_TIMEOUT) {
  try {
    const running = execSui(suiPath, ["move", command, "--path", projectPath], {
      encoding: "utf-8",
      timeout,
      killSignal: "SIGKILL",
    });
    running.child.stdin.end();
    const { stdout } = await running;
    return { success: true, stdout, stderr: "" };
  } catch (err) {
    return {
      success: false,
      stdout: err.stdout ?? "",
      stderr: err.stderr || err.message,
      exitCode: typeof err.code === "number" ? err.code : null,
    };
  }
}

// ── Evaluate build/test results ──────────────────────────────────────
export function evaluateResult(buildResult, testResult, evalConfig) {
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
export function codeSystemPrompt(skillContext, packageName, language) {
  if (language !== "move") {
    const dependencies = JSON.parse(readFileSync(new URL("./typescript/package.json", import.meta.url), "utf8")).dependencies;
    return `You are an expert Sui TypeScript developer. Write complete, self-contained ${language === "tsx" ? "React TSX" : "TypeScript"} sources that pass strict tsc --noEmit.
The validation environment has these exact dependencies: ${JSON.stringify(dependencies)}.
Use ES2022, ES modules, Bundler module resolution and react-jsx. Include all imports and definitions.
Put sources in fenced ts/typescript/tsx blocks. For multiple files, name EVERY block with filename=dapp-kit.ts or filename=App.tsx in the opening fence, or a first-line // filename.ts comment. Relative imports must resolve to included files.
Only .ts/.tsx source files are accepted, with no .d.ts stubs, explicit any types or checking suppressions. Do not provide package.json or tsconfig.json. The harness supplies no placeholder variables or API stubs.
This is offline typechecking only: no code will be executed, no network/chain behavior is verified. Use dummy addresses and keys in examples.

${skillContext}`;
  }
  return `You are an expert Sui Move developer. Write complete, self-contained Sui Move code that compiles.

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
}

async function generateCode(skillContext, prompt, packageName, language, signal) {
  const systemPrompt = codeSystemPrompt(skillContext, packageName, language);
  client ??= new Anthropic();

  const response = await client.messages.create({
    model: EVAL_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  }, { signal });

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
  const evals = selectedEvals(evalFile);
  const skillContext = loadSkillContext(evalFile);

  const results = await Promise.all(
    evals.map(async (ev) => {
      const evalId = ev.id ?? `${skillDir}-code-${evals.indexOf(ev)}`;
      const packageName = ev.package_name ?? "test_project";
      const language = evalLanguage(ev);

      await evalSemaphore.acquire();
      let tmpDir = null;
      try {
        const deadline = Date.now() + EVAL_TIMEOUT;
        const remaining = () => {
          const ms = deadline - Date.now();
          if (ms <= 0) throw new Error(`Eval timed out: ${evalId}`);
          return Math.min(BUILD_TIMEOUT, ms);
        };
        const work = async () => {
          // 1. Generate code
          const response = offlineResponses
            ? offlineResponses[evalId]
            : await generateCode(skillContext, ev.prompt, packageName, language, AbortSignal.timeout(EVAL_TIMEOUT));
          if (typeof response !== "string") throw new Error(`Missing offline response for ${evalId}`);
          remaining();

          if (language !== "move") {
            const { buildResult, moduleCount, validation } = await checkTypeScript(response, language, { timeout: remaining() });
            const evaluation = evaluateResult(buildResult, null, ev);
            return { response, status: evaluation.overall ? "PASS" : "FAIL", error: null, buildResult, testResult: null, evaluation, moduleCount, validation };
          }

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
          const buildResult = await runSuiCommand(suiPath, "build", tmpDir, remaining());

          // 6. Test (if requested and build passed)
          let testResult = null;
          if (ev.check === "test" && buildResult.success) {
            testResult = await runSuiCommand(suiPath, "test", tmpDir, remaining());
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

        const result = await work();

        return {
          result: {
            skill: skillDir,
            eval_id: evalId,
            status: result.status,
            check: ev.check,
            expected_result: ev.expected_result,
            language,
            validation: result.validation ?? { language: "move", mode: ev.check },
            build: result.evaluation?.build ?? null,
            test: result.evaluation?.test ?? null,
            code_extracted: result.moduleCount > 0,
            module_count: result.moduleCount,
            response_excerpt: result.response.slice(0, 200),
            error: result.error,
            diagnostics: result.buildResult?.success === false ? result.buildResult.stderr.slice(0, 8000) : null,
          },
          pass: result.status === "PASS",
        };
      } catch (err) {
        return {
          result: {
            skill: skillDir,
            eval_id: evalId,
            language,
            check: ev.check,
            expected_result: ev.expected_result,
            validation: { language, mode: language === "move" ? ev.check : "typecheck" },
            status: "ERROR",
            error: err.message.slice(0, 2000),
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
          console.log(`    build: ${result.build.detail}`);
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
  for (const [name, value] of [["responses", responsesFlag], ["language", languageFlag], ["output", outputFlag]]) {
    if (args.some((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`)) && (!value || value.startsWith("--"))) {
      throw new Error(`--${name} requires a value`);
    }
  }
  if (!Number.isSafeInteger(CONCURRENCY) || CONCURRENCY < 1) throw new Error("--concurrency must be a positive integer");
  if (!Number.isInteger(EVAL_TIMEOUT) || EVAL_TIMEOUT < 1 || EVAL_TIMEOUT > 2147483647) throw new Error("--timeout must be a positive integer <= 2147483647");
  if (languageFlag && !["move", "typescript", "tsx"].includes(languageFlag)) throw new Error(`Unsupported language: ${languageFlag}`);
  if (responsesFlag) {
    offlineResponses = JSON.parse(readFileSync(resolve(responsesFlag), "utf8"));
    if (!offlineResponses || Array.isArray(offlineResponses) || typeof offlineResponses !== "object") throw new Error("--responses must contain an object mapping eval IDs to response strings");
  }

  // 2. Discover code eval files
  const evalFiles = discoverEvalFiles("code-evals.json", {
    skillFilter: skillFlag,
    changedOnly,
  }).filter((file) => selectedEvals(file).length > 0);

  if (evalFiles.length === 0) {
    console.log("No code eval files to run.");
    process.exit(0);
  }

  const needsMove = evalFiles.some((file) => selectedEvals(file).some((ev) => evalLanguage(ev) === "move"));
  if (evalFiles.some((file) => selectedEvals(file).some((ev) => evalLanguage(ev) !== "move"))) assertTypeScriptDependencies();
  const suiPath = needsMove ? findSuiCli() : null;
  const version = needsMove ? checkSuiVersion(suiPath) : { raw: "not required (TypeScript/TSX only)" };

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
  const outPath = outputFlag ? resolve(outputFlag) : join(ROOT, "scripts", "code-eval-results.json");
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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
