/**
 * Make the request Cloudflare's Workers AI endpoint will actually accept.
 *
 * The gateway's `/compat` path advertises an OpenAI-compatible chat-completions
 * API, and it is not quite one. Workers AI validates `messages[].content` as a
 * *string*; pi serialises the OpenAI content-parts form -- an array of
 * `{type:"text", text}` blocks -- and gives an assistant message that carries
 * `tool_calls` a `content` of `null`. Both are legal OpenAI and both are
 * rejected:
 *
 *   AiError: Bad input: oneOf at '/' not met, 0 matches:
 *     Type mismatch of '/messages/0/content', 'array' not in 'string',
 *     Type mismatch of '/messages/2/content', 'string' not in 'null',
 *     required properties at '/messages/2' are 'role,content'
 *
 * The first turn of a conversation is plain string content, so it succeeds --
 * 200, with a correctly streamed tool_calls delta. Appending a tool result is
 * what produces the shape Workers AI refuses, so every turn after the first
 * tool call returns 400. The SDK surfaces that as "The model returned an empty
 * response", which is how nine of fourteen open-weight models came to look like
 * they were sitting silent: a context limit, an unfinished tool loop, injected
 * junk and a missing capability were all proposed and none of them was it. The
 * models answered. The request was rejected.
 *
 * pi has compat flags for this family of quirks -- requiresToolResultName,
 * requiresAssistantAfterToolResult, requiresThinkingAsText -- but none for
 * flattening content to a string, so there is nothing to configure. This
 * rewrites the body on the way out instead.
 *
 * Narrow on purpose: it touches only the gateway host, only `messages`, and only
 * the two fields named in the error. Anything else passes through untouched.
 *
 * It flattens text and drops non-text parts, which is correct for this suite
 * (text-only prompts) and would silently lose an image on a vision eval. If
 * these models are ever given images, this has to grow a case rather than be
 * trusted.
 */

const HOST = process.env.CF_COMPAT_HOST ?? "gateway.ai.cloudflare.com";
/** Set to "0" to send pi's bodies unmodified, e.g. to confirm the 400 is still there. */
const ARMED = process.env.CF_COMPAT !== "0";

/** The text of a content value, whatever shape it arrived in. */
export function flattenContent(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part: any) => {
        if (typeof part === "string") return part;
        if (part && typeof part.text === "string") return part.text;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return String(content);
}

/**
 * Rewrite a chat-completions body in place of pi's.
 *
 * Returns the new body and how many messages changed, so a caller can say
 * whether it did anything rather than assuming it did.
 */
export function normaliseBody(raw: string): { body: string; changed: number } {
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { return { body: raw, changed: 0 }; }
  if (!Array.isArray(parsed?.messages)) return { body: raw, changed: 0 };

  let changed = 0;
  parsed.messages = parsed.messages.map((m: any) => {
    if (!m || typeof m !== "object") return m;
    // A string is already what Workers AI wants; leave it exactly as it is so
    // the turns that already succeed are not touched.
    if (typeof m.content === "string") return m;
    const content = flattenContent(m.content);
    changed += 1;
    return { ...m, content };
  });

  return { body: changed ? JSON.stringify(parsed) : raw, changed };
}

let announced = false;

if (ARMED) {
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = String(typeof input === "string" || input instanceof URL ? input : input?.url ?? "");
    if (!url.includes(HOST) || typeof init?.body !== "string") {
      return real(input as any, init);
    }
    const { body, changed } = normaliseBody(init.body);
    if (changed && !announced) {
      announced = true;
      console.log(
        `[cf-compat] rewriting message content to strings for ${HOST}: ` +
        `Workers AI rejects content arrays and null content with HTTP 400.`,
      );
    }
    return real(input as any, changed ? { ...init, body } : init);
  }) as typeof fetch;
}
