// Compile generated sources; never import or execute them. The compiler and its
// configuration come exclusively from our locked harness, not from the answer.
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const HARNESS = fileURLToPath(new URL("../typescript/", import.meta.url));
const WORKER = join(HARNESS, "check.js");
const MAX_SOURCE_BYTES = 256 * 1024;
const runCompiler = promisify(execFile);

export function assertTypeScriptDependencies() {
  if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("TypeScript code evals require Node >=22");
  const { dependencies } = JSON.parse(readFileSync(join(HARNESS, "package.json"), "utf8"));
  for (const [name, version] of Object.entries(dependencies)) {
    let installed;
    try { installed = JSON.parse(readFileSync(join(HARNESS, "node_modules", name, "package.json"), "utf8")).version; } catch { /* missing or incomplete install */ }
    if (installed !== version) throw new Error(`TypeScript dependency ${name}: expected ${version}, found ${installed ?? "missing"}. Run npm ci --prefix scripts/typescript --ignore-scripts`);
  }
}

export function validationIdentity(language, {
  lock = readFileSync(join(HARNESS, "package-lock.json"), "utf8"),
  config = readFileSync(join(HARNESS, "tsconfig.json"), "utf8"),
  implementation = readFileSync(new URL(import.meta.url), "utf8") + readFileSync(WORKER, "utf8"),
} = {}) {
  return {
    language,
    mode: "typecheck",
    fingerprint: createHash("sha256")
      .update(JSON.stringify([language, "typecheck", process.version, lock, config, implementation]))
      .digest("hex"),
  };
}

export function extractTypeScriptFiles(response, language) {
  if (!['typescript', 'tsx'].includes(language)) throw new Error(`Unsupported language: ${language}`);
  if (Buffer.byteLength(response) > MAX_SOURCE_BYTES) throw new Error("Response exceeds 256 KiB source limit");
  // Consume all fences, including other languages, so selected blocks cannot be
  // found accidentally inside a different fenced example. Never drop a partial
  // selected block while compiling the rest of an answer.
  const blocks = [];
  let open = null;
  for (const line of response.split(/\r?\n/)) {
    if (open) {
      if (open.close.test(line)) {
        if (open.selected) blocks.push({ tag: open.tag, header: open.header, content: open.lines.join("\n") });
        open = null;
      } else if (open.selected) open.lines.push(line);
      continue;
    }
    const match = line.match(/^ {0,3}(`{3,}|~{3,})([\w-]*)(?:[ \t]+(.*))?$/);
    if (match) {
      const [, fence, tag, header = ""] = match;
      open = { close: new RegExp(`^ {0,3}${fence[0]}{${fence.length},}[ \\t]*$`), tag, header, lines: [], selected: ["ts", "typescript", "tsx"].includes(tag) };
    }
  }
  if (open?.selected) throw new Error("Unterminated TypeScript code fence");
  if (!blocks.length) throw new Error(`No TypeScript code blocks found in response (${language})`);
  if (blocks.length > 16) throw new Error("Response exceeds 16 source files");
  const seen = new Set();
  return blocks.map(({ tag, header, content }) => {
    const commentName = content.match(/^\s*\/\/\s*([\w./-]+\.tsx?)\s*\r?\n/)?.[1];
    const headerName = header.trim().match(/^filename=([\w./-]+\.tsx?)$/)?.[1];
    if (header.trim() && !headerName) throw new Error(`Use filename=name.ts in fence headers: ${header}`);
    if (headerName && commentName && headerName !== commentName) throw new Error("Conflicting source filenames in fence header and comment");
    const path = headerName ?? commentName ?? (blocks.length === 1 ? `index.${tag === 'tsx' ? 'tsx' : 'ts'}` : null);
    if (!path) throw new Error("Multiple TypeScript blocks require filenames (filename=App.tsx or // App.tsx)");
    if (!/^[\w-]+(?:[\w./-]*[\w-])?\.tsx?$/.test(path) || path.split('/').some((p) => !p || p === '..' || p === '.' || p.toLowerCase() === 'node_modules') || path.endsWith('.d.ts')) {
      throw new Error(`Unsafe or unsupported source filename: ${path}`);
    }
    if (language === 'typescript' && path.endsWith('.tsx')) throw new Error("TSX source requires language: tsx");
    if (seen.has(path.toLowerCase())) throw new Error(`Duplicate source filename: ${path}`);
    seen.add(path.toLowerCase());
    if (!content.trim()) throw new Error(`Empty source file: ${path}`);
    return { path, content };
  });
}

export async function checkTypeScript(response, language, { timeout = 120000 } = {}) {
  const deadline = Date.now() + timeout;
  const files = extractTypeScriptFiles(response, language);
  assertTypeScriptDependencies();
  const validation = validationIdentity(language);
  const project = realpathSync(mkdtempSync(join(tmpdir(), "sui-typescript-eval-")));
  try {
    // Only the trusted compiler runs, with no inherited credentials, NODE_OPTIONS,
    // or package-manager hooks. Source files are data to tsc, never entry points.
    mkdirSync(join(project, "home"));
    symlinkSync(join(HARNESS, "node_modules"), join(project, "node_modules"), "dir");
    writeFileSync(join(project, "package.json"), '{"private":true,"type":"module"}');
    const config = JSON.parse(readFileSync(join(HARNESS, "tsconfig.json"), "utf8"));
    writeFileSync(join(project, "tsconfig.json"), JSON.stringify({ ...config, files: files.map((f) => f.path) }));
    for (const file of files) {
      const target = resolve(project, file.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, file.content);
    }
    try {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error("ETIMEDOUT: validation deadline expired");
      const checking = runCompiler(process.execPath, ["--max-old-space-size=512", WORKER, join(project, "tsconfig.json")], {
        cwd: project,
        env: { HOME: join(project, "home"), TMPDIR: project, PATH: dirname(process.execPath) },
        encoding: "utf8",
        timeout: remaining,
        killSignal: "SIGKILL",
        maxBuffer: 1024 * 1024,
      });
      checking.child.stdin.end();
      const { stdout } = await checking;
      const result = JSON.parse(stdout);
      if (typeof result.success !== "boolean" || typeof result.diagnostics !== "string") throw new Error("Invalid compiler worker result");
      return {
        buildResult: { success: result.success, stdout: "", stderr: result.diagnostics.split(project).join("<project>") },
        moduleCount: files.length,
        validation,
      };
    } catch (err) {
      // Only a completed compiler check may satisfy a negative eval. Any worker
      // launch/configuration/policy failure or signal is an infrastructure ERROR.
      const diagnostics = [err.stdout, err.stderr, err.message].filter(Boolean).join("\n").split(project).join("<project>");
      throw new Error(`TypeScript compiler did not complete (${err.code ?? (err.killed ? "ETIMEDOUT" : err.signal ?? "ERROR")}): ${diagnostics.slice(0, 2000)}`);
    }
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
}
