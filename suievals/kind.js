/**
 * What kind of question an eval is.
 *
 * ETHEVALS labels its evals "quiz" or "goal", where a goal is a build task with a
 * verifiable end state -- deploy a dApp on Scaffold-ETH 2, and something checks
 * whether it runs. We have none of those. Every eval here is answered in writing
 * and graded by reading the answer against expectations, so borrowing "goal" would
 * claim a verification step that does not exist.
 *
 * What our corpus does have is five recognisably different asks, and they fail for
 * different reasons: a model that cannot recall a documented limit is a different
 * problem from one that writes plausible code against an API that moved. The label
 * is for the reader scanning a list of misses, not for scoring -- nothing is
 * weighted by it.
 *
 * The label is derived from the prompt, which means it is sometimes wrong. An eval
 * can set `"kind"` in its evals.json and that is used instead, so a mislabelled one
 * is fixed where it lives rather than by tuning a regex.
 */

export const KINDS = {
  explain: { label: "explain", desc: "Recall and explain how something works." },
  design: { label: "design", desc: "Choose an approach for a described system." },
  build: { label: "build", desc: "Produce working code against a spec. Read, not run." },
  choose: { label: "choose", desc: "Pick between named options and justify it." },
  review: { label: "review", desc: "Code is supplied; find what is wrong with it." },
};

export const KIND_IDS = Object.keys(KINDS);

/** The kind of a single eval. An explicit `kind` on the eval always wins. */
export function kindOf(evalObj) {
  const explicit = String(evalObj?.kind ?? "").trim();
  if (explicit && KINDS[explicit]) return explicit;

  const p = String(evalObj?.prompt ?? "");
  const hasCode = /```/.test(p);

  // Order matters. "Review this module ... ```move" is a review before it is a
  // build, and "which should I use" is a choice before it is an explanation.
  if (hasCode && /\b(review|what'?s wrong|security issues|audit|problems?|vulnerab|fix|error|fails?)\b/i.test(p)) {
    return "review";
  }
  if (/\b(vs\.?|versus|difference between|which should i use|when should i use|better|compare|or should i)\b/i.test(p)) {
    return "choose";
  }
  if (/\b(write|build|implement|create|set up|help me|show me the code|give me (a|the) (code|example|snippet))\b/i.test(p)) {
    return "build";
  }
  // A question that opens by describing the asker's situation is asking for an
  // approach, not for a definition.
  if (/^(i'?m |i am |i need |i want |my )/i.test(p.trim())) return "design";
  return "explain";
}
