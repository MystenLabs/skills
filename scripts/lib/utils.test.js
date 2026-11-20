import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { withTimeout } from "./utils.js";

test("completed work clears the timer on both fulfillment and rejection", () => {
  execFileSync(process.execPath, ["--input-type=module", "-e", `
    import assert from 'node:assert/strict';
    import { withTimeout } from './utils.js';
    assert.equal(await withTimeout(Promise.resolve(42), 30000, 'success'), 42);
    await assert.rejects(withTimeout(Promise.reject(new Error('failed')), 30000, 'failure'), /failed/);
  `], { cwd: fileURLToPath(new URL("./", import.meta.url)), timeout: 5000 });
});

test("pending work still rejects with the labeled deadline", async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 1, "probe"), /Eval timed out after 1ms: probe/);
});
