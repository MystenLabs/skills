# Executable code evals

`run-evals.js` grades answers as text using a judge, with a separate response/judge
cache. `run-code-evals.js` checks generated source with real compilers. It does
not judge the prose expectations or enforce `forbidden_patterns`. A compiler PASS
does not establish that the answer meets all task requirements.

Code evals default to `language: "move"`; the existing Move build/test behavior and
positive/negative grading are retained. The seven existing SDK, PTB and React
cases now explicitly select `typescript` or `tsx`. For these, `check: "build"`
means **strict offline typechecking**, not emission, execution or chain validation.
`check: "test"` is supported only for Move. Unsupported languages/modes fail.

## Install and run

Use Node 22 or newer (required by the pinned Sui SDK):

```sh
npm ci --ignore-scripts
npm ci --prefix scripts/typescript --ignore-scripts
npm test
npm run test:code-evals
```

The isolated TypeScript dependency set is optional for Move-only runs. Its exact
versions and transitive dependencies live in `typescript/package.json` and
`typescript/package-lock.json`; `npm ci` must be used to reproduce them.

Pins follow `frontend-apps/setup.md`'s guidance to check published versions and
peer compatibility: dApp Kit React 2.1.40 resolves core 1.6.38, whose Sui peer is
`^2.36.0`; React/types 19.2 meet its `>=17` peers. TypeScript 5.9.3 is verified
against the actual declarations with `skipLibCheck: false`. Node 22 types support
script examples and wallet-standard's `Error.captureStackTrace` declaration.
The runner checks installed direct dependency versions before generation. When
updating pins, update the lockfile and rerun the offline suite. Installed SDK docs
at `node_modules/@mysten/*/docs/llms-index.md` match those versions.

With an API key, these commands generate responses and incur provider charges:

```sh
node scripts/run-code-evals.js --skill sui-sdks --concurrency 1
node scripts/run-code-evals.js --skill ptbs --concurrency 1
node scripts/run-code-evals.js --language tsx --concurrency 1
```

## Offline responses

Pass `--responses responses.json` to bypass generation completely. The file maps
each selected eval's ID to a complete Markdown response string. Missing responses
are errors; they never fall back to the provider. For example:

```json
{
  "multi-step-ptb": "```ts\nimport { Transaction } from '@mysten/sui/transactions';\nconst tx = new Transaction();\n```",
  "kiosk-list-via-ptb": "```ts\nimport { Transaction } from '@mysten/sui/transactions';\nconst tx = new Transaction();\n```"
}
```

```sh
node scripts/run-code-evals.js --skill ptbs --responses responses.json --output /tmp/code-results.json
```

That minimal example demonstrates compilation only; representative complete
responses for real eval tasks are in `scripts/fixtures/` and exercised by tests.

Single files may use unnamed `ts`, `typescript`, or `tsx` fences. Every block in
a multi-file answer needs a name, either `filename=dapp-kit.ts` in the opening
fence or `// dapp-kit.ts` on its first line. For React, use separate `dapp-kit.ts`
and `App.tsx` files with resolvable relative imports. All selected sources compile
together; Move fences are ignored by this lane and TS fences by the Move lane.
Unterminated selected fences, aliased or case-colliding filenames, directory
traversal, declaration files, broad
ambient module stubs, placeholder `declare` values, explicit `any` types and
TypeScript checking-suppression directives are errors.
The documented dApp Kit `Register` module augmentation is supported.

The harness controls `tsconfig.json`: ES2022, ESNext modules, Bundler resolution,
`react-jsx`, DOM/Node/React types, `strict`, `noEmit`, and full library checking.
It does not invent an HTML entry, mount a React root or stub missing components.
Every supplied source file is an entry in the compiler project.

## Results, timeouts and isolation

Compiler diagnostics produce `FAIL`, `build.pass: false`, a nonzero runner exit,
console detail and up to 8 KiB of diagnostics in the result JSON. Missing source,
invalid configuration, timeouts and abnormal compiler termination produce `ERROR`.
Existing negative evals still pass only when compilation fails and the configured
error pattern matches; TypeScript compiler infrastructure errors cannot satisfy
negative checks.

There is **no code response or validation-result cache**. Every invocation compiles
again, including offline responses. The text evaluator's caches and grading are
untouched. Results include a validation identity with language, mode and a SHA-256
fingerprint of the validator/worker implementation, Node version, dependency lock
and tsconfig. A future result cache would also need the response and eval config.

The trusted worker uses TypeScript's compiler API for the equivalent of
`tsc --noEmit`. Parsing, source-policy checks and typechecking all run in that
subprocess with a 512 MiB V8 heap, a 1 MiB output limit, a 120-second maximum
bounded by the remaining eval deadline, and forced termination on timeout.
The parent remains responsive to timers and request cancellation while it runs.
Response sources are limited to 256 KiB and 16 files.
Temporary projects are private directories and removed in `finally`, on success,
compilation failure and compiler timeout. Dependency installation happens once,
outside generated projects, with lifecycle scripts disabled. The default eval
concurrency is two, including compiler subprocesses; low-memory runs can select
one with `--concurrency 1`. Move commands also run asynchronously with argument
arrays rather than a shell, so they cannot block TypeScript cancellation and
executable paths containing spaces work.

TypeScript/TSX is **never executed or imported**. The compiler receives a fresh HOME
and an allowlisted environment without API keys, wallet credentials or NODE_OPTIONS.
The compiler reads source/declaration files; this is not an OS filesystem sandbox.
No generated npm scripts, plugins or configurations are loaded. Typechecking
makes no network/chain calls. It cannot verify wallet interaction,
RPC success, Move target signatures, gas costs, mainnet allowlists or transaction
effects. This lane provides no runtime or chain checks. Any future JavaScript
execution needs network/filesystem isolation and dummy credentials.

The deterministic regression workflow uses no secrets, API generation or Sui
installation. Its Move CLI test double checks routing, build/test invocation,
failure grading and cleanup; it does **not** prove real Move compilation. Full
Move evals still require Sui >=1.63 and may fetch framework dependencies.
