/**
 * What we actually sent, and what actually came back.
 *
 * Nine of fourteen open-weight models returned empty answers with tools enabled.
 * Four explanations were offered and discarded -- a context limit (dead:
 * deepseek-v4-flash has a 1.3M window and still failed 54%), an unfinished tool
 * loop (a third of the cases), junk being injected (the control model never
 * received it), a declared incapability (the compat flags are identical between
 * the models that work and the ones that do not). Each was a story built from a
 * correlation, and each cost a run to disprove.
 *
 * The Cloudflare gateway logs this exchange, but the token we hold is scoped to
 * AI Gateway Run and cannot read them back, and it is not ours to change. That
 * turns out not to matter: we are the client. The request leaves this process
 * and the response arrives in it, so the one place guaranteed to see both is
 * here.
 *
 * Importing this module installs the patch; set EVAL_WIRE_LOG=1 to arm it. Off,
 * it costs one env read. On, it is a debugging instrument and nothing else --
 * it buffers whole response bodies and must not be left on in a scored run.
 */

const ARMED = process.env.EVAL_WIRE_LOG === "1";
/** Which hosts to report on. Default: the gateway, since that is the open question. */
const MATCH = process.env.EVAL_WIRE_MATCH ?? "gateway.ai.cloudflare.com";
const BODY_CHARS = Number(process.env.EVAL_WIRE_BODY ?? 1200);

let n = 0;

function summariseRequest(body: string): string {
  let parsed: any;
  try { parsed = JSON.parse(body); } catch { return `  (body is not JSON, ${body.length}B)`; }

  const lines: string[] = [];
  lines.push(`  model=${parsed.model}  stream=${parsed.stream ?? false}  messages=${parsed.messages?.length ?? 0}`);

  // The question this exists to answer: were tool schemas in the request, and
  // in which of the two shapes the chat-completions API accepts?
  const tools = parsed.tools ?? parsed.functions;
  if (tools) {
    const names = tools.map((t: any) => t.function?.name ?? t.name).filter(Boolean);
    lines.push(`  tools=${tools.length} [${names.join(", ")}]  tool_choice=${JSON.stringify(parsed.tool_choice ?? "(unset)")}`);
  } else {
    lines.push(`  tools=(none in the request)`);
  }
  for (const k of ["temperature", "max_tokens", "max_completion_tokens", "thinking", "reasoning_effort"]) {
    if (parsed[k] !== undefined) lines.push(`  ${k}=${JSON.stringify(parsed[k])}`);
  }
  return lines.join("\n");
}

function summariseResponse(status: number, ctype: string, body: string): string {
  const lines = [`  status=${status}  content-type=${ctype}  ${body.length}B`];
  // Anything that is not a 2xx gets printed whole, before any attempt to read
  // structure out of it. The first version of this parsed the JSON, found no
  // `error`, `choices` or `usage` key, and printed nothing at all -- so six
  // HTTP 400s showed up as a bare status line and the body that would have
  // explained them was discarded by the tool written to capture it.
  if (status < 200 || status >= 300) {
    lines.push(`  BODY: ${body.slice(0, 2000)}`);
    return lines.join("\n");
  }
  // A chat-completions answer, an SSE stream, or an error -- all three matter
  // and all three look like "empty response" by the time the SDK is done.
  try {
    const parsed = JSON.parse(body);
    if (parsed.error) lines.push(`  error: ${JSON.stringify(parsed.error).slice(0, 400)}`);
    const choice = parsed.choices?.[0];
    if (choice) {
      lines.push(`  finish_reason=${choice.finish_reason}`);
      const msg = choice.message ?? {};
      lines.push(`  content=${JSON.stringify(msg.content ?? null)?.slice(0, 300)}`);
      if (msg.tool_calls) lines.push(`  tool_calls=${JSON.stringify(msg.tool_calls).slice(0, 500)}`);
      if (msg.reasoning_content) lines.push(`  reasoning_content=${String(msg.reasoning_content).length}B`);
    }
    if (parsed.usage) lines.push(`  usage=${JSON.stringify(parsed.usage)}`);
  } catch {
    lines.push(`  raw: ${body.slice(0, BODY_CHARS)}`);
  }
  return lines.join("\n");
}

if (ARMED) {
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = String(typeof input === "string" || input instanceof URL ? input : input?.url ?? "");
    if (!url.includes(MATCH)) return real(input as any, init);

    const i = ++n;
    const body = typeof init?.body === "string" ? init.body : "";
    console.log(`\n[wire ${i}] -> ${init?.method ?? "GET"} ${url}`);
    if (body) console.log(summariseRequest(body));

    const res = await real(input as any, init);
    // clone() so reading the body here does not consume the one the SDK reads.
    let text = "";
    try { text = await res.clone().text(); } catch (err: any) { text = `(unreadable: ${err?.message})`; }
    console.log(`[wire ${i}] <-`);
    console.log(summariseResponse(res.status, res.headers.get("content-type") ?? "?", text));
    return res;
  }) as typeof fetch;
  console.log(`[wire] logging requests to ${MATCH}`);
}

export {};
