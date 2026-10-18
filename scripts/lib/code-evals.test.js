import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkTypeScript, extractTypeScriptFiles, validationIdentity } from './typescript-check.js';
import { codeSystemPrompt, evalLanguage, evaluateResult, extractMoveCode, routeModulesToFiles } from '../run-code-evals.js';

const fixture = (name) => readFileSync(new URL(`../fixtures/${name}.md`, import.meta.url), 'utf8');
const fence = (source, tag = 'ts') => `\`\`\`${tag}\n${source}\n\`\`\``;
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

function offlineRun(skill, responses, extraArgs = [], cwd = ROOT) {
  const temp = mkdtempSync(join(tmpdir(), 'sui-code-test-'));
  try {
    const input = join(temp, 'responses.json');
    const output = join(temp, 'results.json');
    const summary = join(temp, 'summary.md');
    writeFileSync(input, JSON.stringify(responses));
    let status = 0;
    let stdout;
    let stderr = '';
    try {
      stdout = execFileSync(process.execPath, ['scripts/run-code-evals.js', '--skill', skill, '--responses', input, '--output', output, ...extraArgs], {
        cwd, env: { PATH: dirname(process.execPath), HOME: temp, GITHUB_STEP_SUMMARY: summary, ANTHROPIC_API_KEY: 'dummy-offline', ANTHROPIC_BASE_URL: 'http://127.0.0.1:1' }, encoding: 'utf8', timeout: 60000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) { status = err.status; stdout = err.stdout; stderr = err.stderr; }
    if (!existsSync(output)) throw new Error(`Runner exited ${status} before writing results:\n${stderr}\n${stdout}`);
    return { status, stdout, results: JSON.parse(readFileSync(output, 'utf8')), summary: readFileSync(summary, 'utf8') };
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

test('actual PTB evals compile offline without a Sui CLI or provider access', () => {
  const { status, stdout, results } = offlineRun('ptbs', { 'multi-step-ptb': fixture('ptb'), 'kiosk-list-via-ptb': fixture('kiosk') });
  assert.equal(status, 0, stdout);
  assert.match(stdout, /2 code evals, 2 passed, 0 failed/);
  assert.equal(results.length, 2);
  assert.ok(results.every((r) => r.status === 'PASS' && r.build.pass));
  assert.ok(results.every((r) => r.language === 'typescript' && r.validation.mode === 'typecheck'));
});

test('new CLI flags require values instead of falling through to generation', () => {
  for (const name of ['responses', 'language', 'output']) {
    for (const value of [`--${name}`, `--${name}=`]) {
      assert.throws(() => execFileSync(process.execPath, ['scripts/run-code-evals.js', '--skill', 'ptbs', value], {
        cwd: ROOT, env: { PATH: dirname(process.execPath), ANTHROPIC_API_KEY: 'dummy-offline', ANTHROPIC_BASE_URL: 'http://127.0.0.1:1' }, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'],
      }), (err) => err.status === 1 && err.stderr.includes(`--${name} requires a value`));
    }
  }
});

function isolatedCheckout() {
  const root = mkdtempSync(join(tmpdir(), 'sui-harness-test-'));
  try {
    for (const file of ['package.json', 'scripts/run-code-evals.js', 'scripts/lib/utils.js', 'scripts/lib/typescript-check.js', 'scripts/typescript/check.js', 'scripts/typescript/package.json', 'scripts/typescript/package-lock.json', 'scripts/typescript/tsconfig.json', 'ptbs/evals/code-evals.json']) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), readFileSync(join(ROOT, file)));
    }
    symlinkSync(join(ROOT, 'node_modules'), join(root, 'node_modules'), 'dir');
    return root;
  } catch (err) { rmSync(root, { recursive: true, force: true }); throw err; }
}

test('missing TypeScript dependencies fail before constructing a generation client', () => {
  const root = isolatedCheckout();
  try {
    assert.throws(() => execFileSync(process.execPath, ['scripts/run-code-evals.js', '--skill', 'ptbs'], {
      cwd: root, env: { PATH: dirname(process.execPath), HOME: root, ANTHROPIC_API_KEY: 'dummy-offline', ANTHROPIC_BASE_URL: 'http://127.0.0.1:1' }, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'],
    }), (err) => err.status === 1 && /TypeScript dependency.*missing/.test(err.stderr) && /npm ci --prefix/.test(err.stderr));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('harness configuration errors cannot satisfy negative compilation evals', () => {
  const root = isolatedCheckout();
  try {
    symlinkSync(join(ROOT, 'scripts/typescript/node_modules'), join(root, 'scripts/typescript/node_modules'), 'dir');
    const path = join(root, 'ptbs/evals/code-evals.json');
    const evals = JSON.parse(readFileSync(path, 'utf8')).map((ev) => ({ ...ev, expected_result: 'fail', expected_error_pattern: '.' }));
    writeFileSync(path, JSON.stringify(evals));
    for (const [compilerOptions, errorCode] of [[{ target: 'invalid-target' }, /TS6046/], [{ types: ['missing-harness-types'] }, /TS2688/]]) {
      writeFileSync(join(root, 'scripts/typescript/tsconfig.json'), JSON.stringify({ compilerOptions }));
      const { status, results } = offlineRun('ptbs', { 'multi-step-ptb': fixture('ptb'), 'kiosk-list-via-ptb': fixture('kiosk') }, [], root);
      assert.equal(status, 1);
      assert.ok(results.every((r) => r.status === 'ERROR' && r.check === 'build' && r.validation.mode === 'typecheck' && errorCode.test(r.error)));
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('actual multi-file wallet and send TSX evals pass strict SDK/React checking', () => {
  const { status, stdout, results } = offlineRun('frontend-apps', { 'dapp-wallet-connect': fixture('wallet'), 'dapp-send-transaction': fixture('send') }, ['--language', 'tsx']);
  assert.equal(status, 0, stdout);
  assert.ok(results.every((r) => r.status === 'PASS' && r.language === 'tsx'));
  assert.equal(results[0].module_count, 2);
});

test('SDK signing example typechecks; generated side effects never execute', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'sui-no-execution-'));
  try {
    const marker = join(temp, 'must-not-exist');
    const response = fixture('transfer').replace('const client', `import { writeFileSync } from 'node:fs';\nwriteFileSync(${JSON.stringify(marker)}, 'executed');\nconst client`);
    const result = await checkTypeScript(response, 'typescript');
    assert.equal(result.buildResult.success, true, result.buildResult.stderr);
    assert.equal(existsSync(marker), false);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('invalid SDK export/API and a type mismatch remain FAIL, with diagnostics and exit 1', () => {
  const invalid = fence(`import { Transaction, TransactionBlock } from '@mysten/sui/transactions';\nconst tx = new Transaction();\ntx.nonexistentMethod();\nconst amount: bigint = '100';`);
  const { status, stdout, results, summary } = offlineRun('ptbs', { 'multi-step-ptb': invalid, 'kiosk-list-via-ptb': fixture('kiosk') });
  assert.equal(status, 1);
  assert.equal(results[0].status, 'FAIL');
  assert.equal(results[0].build.pass, false);
  assert.match(results[0].diagnostics, /TS2724.*TransactionBlock/);
  assert.match(results[0].diagnostics, /TS2339.*nonexistentMethod/);
  assert.match(results[0].diagnostics, /TS2322/);
  assert.match(stdout, /index.ts/);
  assert.match(summary, /FAIL/);
  assert.equal(results[1].status, 'PASS');
});

test('missing responses are ERROR without a generation fallback', () => {
  const { status, results } = offlineRun('ptbs', {});
  assert.equal(status, 1);
  assert.ok(results.every((r) => r.status === 'ERROR' && /Missing offline response/.test(r.error)));
});

test('mixed fences select TS/TSX and preserve separate source filenames', () => {
  const mixed = `\`\`\`move\nmodule old::m;\n\`\`\`\n${fixture('wallet')}`;
  const files = extractTypeScriptFiles(mixed, 'tsx');
  assert.deepEqual(files.map((f) => f.path), ['dapp-kit.ts', 'App.tsx']);
  assert.deepEqual(extractMoveCode(mixed), ['module old::m;']);
  assert.equal(extractTypeScriptFiles('```typescript\r\n// src/main.ts\r\nexport const x = 1;\r\n```', 'typescript')[0].path, 'src/main.ts');
  assert.throws(() => extractTypeScriptFiles('```move\nmodule x::y;\n```', 'typescript'), /No TypeScript/);
  assert.throws(() => extractTypeScriptFiles(fixture('wallet'), 'typescript'), /requires language/);
  assert.equal(extractTypeScriptFiles(`\`\`\`\`markdown\n\`\`\`ts\ninvalid inner sample\n\`\`\`\n\`\`\`\`\n${fixture('ptb')}`, 'typescript').length, 1);
});

test('source extraction rejects aliases and incomplete selected fences', () => {
  assert.throws(() => extractTypeScriptFiles('```ts filename=src//example.ts\nexport const value: number = "broken";\n```\n```ts filename=src/example.ts\nexport const value = 1;\n```', 'typescript'), /filename|Duplicate/);
  assert.throws(() => extractTypeScriptFiles(`${fence('export const value = 1;')}\n\`\`\`ts\nexport const broken: number = "bad";`, 'typescript'), /Unterminated/);
  assert.throws(() => extractTypeScriptFiles('```ts filename=Example.ts\nexport {};\n```\n```ts filename=example.ts\nexport {};\n```', 'typescript'), /Duplicate/);
});

test('ambiguous blocks, path traversal, duplicates, stubs and suppressions fail closed', async () => {
  for (const response of [
    `${fence('const a=1;')}\n${fence('const b=2;')}`,
    '```ts filename=../escape.ts\nexport {};\n```',
    '```ts filename=src/../../escape.ts\nexport {};\n```',
    '```ts filename=node_modules/index.ts\nexport {};\n```',
    '```ts filename=sdk.d.ts\ndeclare module "fake" {}\n```',
    `${fence('// same.ts\nexport {};')}\n${fence('// same.ts\nexport {};')}`,
    fence(''),
  ]) assert.throws(() => extractTypeScriptFiles(response, 'typescript'));
  assert.throws(() => extractTypeScriptFiles('x'.repeat(262145), 'typescript'), /source limit/);
  for (const source of [
    '// @ts-nocheck\nconst a: number = "wrong";',
    'const valid = 1;\n// @ts-ignore\nconst a: number = "wrong";',
    '/* @ts-expect-error */\nconst a: number = "wrong";',
    '/// <reference path="/tmp/other.ts" />\nexport {};',
    'const tx: any = {}; tx.nonexistent();',
    'declare const missingAddress: string;',
    'declare module "@mysten/sui/*" {}',
    'declare module "@mysten/dapp-kit-react" { export function missing(): void; }',
  ]) await assert.rejects(checkTypeScript(fence(source), 'typescript'), /suppression|Reference directives|Explicit any|Ambient stubs/);
});

test('compiler timeout is an infrastructure ERROR and temporary files are cleaned', async () => {
  const before = readdirSync(tmpdir()).filter((n) => n.startsWith('sui-typescript-eval-')).sort();
  await assert.rejects(checkTypeScript(fixture('ptb'), 'typescript', { timeout: 1 }), /did not complete.*ETIMEDOUT/);
  const after = readdirSync(tmpdir()).filter((n) => n.startsWith('sui-typescript-eval-')).sort();
  assert.deepEqual(after, before);
  const run = offlineRun('ptbs', { 'multi-step-ptb': fixture('ptb'), 'kiosk-list-via-ptb': fixture('kiosk') }, ['--timeout', '1']);
  assert.equal(run.status, 1);
  assert.ok(run.results.every((r) => r.status === 'ERROR' && /timed out|did not complete/.test(r.error)));
});

test('validation identities separate languages/configurations/locked dependency versions', async () => {
  const identity = validationIdentity('typescript');
  assert.equal(identity.mode, 'typecheck');
  assert.equal(identity.fingerprint, validationIdentity('typescript').fingerprint);
  assert.notEqual(identity.fingerprint, validationIdentity('tsx').fingerprint);
  assert.notEqual(identity.fingerprint, validationIdentity('typescript', { lock: 'different dependencies' }).fingerprint);
  assert.notEqual(identity.fingerprint, validationIdentity('typescript', { config: 'different jsx/strict settings' }).fingerprint);
  assert.notEqual(identity.fingerprint, validationIdentity('typescript', { implementation: 'different validator/worker' }).fingerprint);
  // There is no code-result cache. Rechecking a changed answer cannot reuse PASS.
  assert.equal((await checkTypeScript(fence('export const x: number = "bad";'), 'typescript')).buildResult.success, false);
});

test('suppression-looking strings do not disable checking and are accepted', async () => {
  const result = await checkTypeScript(fence(`export const message = "Avoid @ts-ignore";\nexport const template = \`// @ts-nocheck\`;\nexport const reference = '<reference path="anything" />';`), 'typescript');
  assert.equal(result.buildResult.success, true, result.buildResult.stderr);
});

test('compiler work leaves parent timers responsive', async () => {
  const pending = checkTypeScript(fixture('ptb'), 'typescript');
  const timerFirst = await Promise.race([pending.then(() => false), new Promise((resolve) => setTimeout(() => resolve(true), 0))]);
  const result = await pending;
  assert.equal(timerFirst, true);
  assert.equal(result.buildResult.success, true, result.buildResult.stderr);
});

test('Move routing, generation and positive/negative build/test grading are preserved', () => {
  const move = extractMoveCode('```move\nmodule old::one;\npublic fun f() {}\nmodule old::two;\nuse old::one;\n```');
  assert.equal(move.length, 2);
  const routed = routeModulesToFiles([...move, '#[test_only]\nmodule old::one_tests;'], 'eval_pkg');
  assert.deepEqual(routed.map((f) => f.path), ['sources/one.move', 'sources/two.move', 'tests/one_tests.move']);
  assert.match(routed[1].content, /use eval_pkg::one/);
  assert.equal(evalLanguage({ check: 'test' }), 'move');
  assert.throws(() => evalLanguage({ language: 'rust', check: 'build' }), /Unsupported/);
  assert.throws(() => evalLanguage({ language: 'typescript', check: 'test' }), /build/);
  assert.match(codeSystemPrompt('context', 'pkg', 'move'), /module pkg::name/);
  assert.match(codeSystemPrompt('context', 'pkg', 'tsx'), /2.36.0/);
  const ok = { success: true, stderr: '' };
  const bad = { success: false, stderr: 'type mismatch' };
  assert.equal(evaluateResult(ok, ok, { expected_result: 'pass', check: 'test' }).overall, true);
  assert.equal(evaluateResult(ok, bad, { expected_result: 'pass', check: 'test' }).overall, false);
  assert.equal(evaluateResult(bad, null, { expected_result: 'pass', check: 'build' }).overall, false);
  assert.equal(evaluateResult(bad, null, { expected_result: 'fail', expected_error_pattern: 'mismatch' }).overall, true);
  assert.equal(evaluateResult(bad, null, { expected_result: 'fail', expected_error_pattern: 'ability' }).overall, false);
});

test('Move CLI adapter still builds/tests, reports subprocess failure and cleans its projects', () => {
  // This checks the runner's CLI contract, not Move compilation. No Sui toolchain
  // is needed and no generated Move code is executed by this test double.
  const temp = mkdtempSync(join(tmpdir(), 'sui-cli-adapter-'));
  try {
    const cli = join(temp, 'fake sui');
    const log = join(temp, 'calls.jsonl');
    writeFileSync(cli, `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args[0] === '--version') { console.log('sui 1.63.0'); process.exit(0); }
if (fs.readFileSync(0, 'utf8') !== '') process.exit(7);
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(args) + '\\n');
if (args[0] !== 'move' || args[2] !== '--path') process.exit(9);
const dir = args[3];
if (!fs.existsSync(dir + '/Move.toml') || !fs.existsSync(dir + '/sources/m.move')) process.exit(8);
if (args[1] === 'test') { console.error('simulated test failure'); process.exit(1); }
`);
    chmodSync(cli, 0o700);
    const responses = Object.fromEntries(['token-mint-burn-tests', 'expected-failure-auth', 'event-verification-test'].map((id) => [id, '```move\nmodule generated::m;\npublic fun f() {}\n```']));
    const { status, results } = offlineRun('move-unit-testing', responses, ['--sui-path', cli, '--concurrency', '1']);
    assert.equal(status, 1);
    assert.ok(results.every((r) => r.language === 'move' && r.status === 'FAIL' && r.build.pass && !r.test.pass));
    assert.ok(results.every((r) => /simulated test failure/.test(r.test.detail)));
    const calls = readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse);
    assert.deepEqual(calls.map((a) => a[1]), ['build', 'test', 'build', 'test', 'build', 'test']);
    assert.ok(calls.every((a) => !existsSync(a[3])));
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
