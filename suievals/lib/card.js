/**
 * A card: one run of the suite, in the shape the board reads.
 *
 * Cards arrive by pull request from people running the suite on their own model,
 * so every field the board relies on is checked here rather than trusted. The
 * checks that matter are not about JSON shape:
 *
 *   - An id that is not in the suite means the run scored something that does not
 *     exist, usually because ids were invented per skill and collided.
 *   - A grade array of the wrong length means expectations were skipped or
 *     doubled, and the pass rate is over a denominator nobody else has.
 *   - A run covering part of the suite is not a lower score, it is a different
 *     measurement, so it is marked rather than ranked.
 *   - A suite fingerprint that does not match means the evals changed after the
 *     run, and the card is shown as against an older set instead of beside
 *     current ones.
 */

export const SKILL_MODES = ["sui-skills", "none"];

/**
 * An answers file: what the model said, before anyone has graded it.
 *
 * This is the shape worth submitting. A self-graded card is published and then
 * held out of the ranking, because a model marking its own paper is the easier of
 * two measurements -- so the work of running 158 questions buys a row that cannot
 * be read against anything. Answers can be graded by the same judge that grades
 * every other run, and that card ranks.
 */
export function validateAnswers(sub, { evals }) {
  const problems = [];
  const byId = new Map(evals.map((e) => [e.id, e]));

  if (!sub.model || typeof sub.model !== "string") problems.push('"model" is required: the model that answered.');
  if (!SKILL_MODES.includes(sub.skills)) {
    problems.push(`"skills" must be ${SKILL_MODES.map((m) => `"${m}"`).join(" or ")}.`);
  }
  const answers = sub.answers;
  if (!answers || typeof answers !== "object") {
    problems.push('"answers" must be an object of {eval id: the model\'s answer}.');
    return problems;
  }

  let short = 0;
  for (const [id, text] of Object.entries(answers)) {
    if (!byId.has(id)) { problems.push(`"${id}" is not an eval in this suite. Ids are qualified: "object-model/1".`); continue; }
    if (typeof text !== "string") { problems.push(`"${id}" is not a string.`); continue; }
    if (text.trim().length < 40) short += 1;
  }

  const required = evals.filter((e) => e.pillar !== "unmapped");
  const missing = required.filter((e) => !(e.id in answers));
  if (missing.length) {
    problems.push(
      `${missing.length} of ${required.length} evals are unanswered. `
      + `Missing: ${missing.slice(0, 5).map((e) => e.id).join(", ")}${missing.length > 5 ? ` and ${missing.length - 5} more` : ""}.`,
    );
  }
  // A run where the model answered nothing is not a run that scored badly, and it
  // costs a judge call per eval to discover that after the fact.
  if (short > required.length / 2) {
    problems.push(`${short} of ${Object.keys(answers).length} answers are under 40 characters, so this reads as a run that did not execute rather than one that scored badly.`);
  }

  return problems;
}

/** Every way a card can be wrong, as a list of sentences. Empty means valid. */
export function validateCard(card, { evals, manifest: suite, pillarIds }) {
  const problems = [];
  const byId = new Map(evals.map((e) => [e.id, e]));

  if (card.suievals_card !== 1) problems.push('"suievals_card" must be 1 — it is the card format version.');
  if (!card.model || typeof card.model !== "string") problems.push('"model" is required: the model that answered, e.g. "claude-opus-5".');
  if (!SKILL_MODES.includes(card.skills)) {
    problems.push(`"skills" must be one of ${SKILL_MODES.map((m) => `"${m}"`).join(" or ")} — "sui-skills" if the skill was in context, "none" for the baseline.`);
  }
  if (!card.graded_by || typeof card.graded_by !== "string") {
    problems.push('"graded_by" is required: "self", "human", or "judge:<model>". A self-graded card is published, and labelled.');
  }
  if (!card.recorded_at || Number.isNaN(Date.parse(card.recorded_at))) {
    problems.push('"recorded_at" must be an ISO timestamp.');
  }

  const rows = Array.isArray(card.evals) ? card.evals : null;
  if (!rows || !rows.length) {
    problems.push('"evals" must be a non-empty array of {id, pass, of}.');
    return problems;
  }

  const seen = new Set();
  for (const r of rows) {
    if (!r || typeof r.id !== "string") { problems.push(`An entry in "evals" has no string id: ${JSON.stringify(r)}`); continue; }
    const e = byId.get(r.id);
    if (!e) { problems.push(`"${r.id}" is not an eval in this suite. Ids are qualified: "object-model/1", not "1".`); continue; }
    if (seen.has(r.id)) problems.push(`"${r.id}" appears twice.`);
    seen.add(r.id);
    if (!Number.isInteger(r.of) || r.of !== e.count) {
      problems.push(`"${r.id}" reports ${r.of} expectations; the eval has ${e.count}. Grade every expectation, in the order they are written.`);
    }
    if (!Number.isInteger(r.pass) || r.pass < 0 || r.pass > r.of) {
      problems.push(`"${r.id}" reports ${r.pass} of ${r.of} passed, which is not a count between 0 and ${r.of}.`);
    }
  }

  // Coverage. Unmapped evals are excluded from scoring, so they are not required.
  const required = evals.filter((e) => e.pillar !== "unmapped").map((e) => e.id);
  const missing = required.filter((id) => !seen.has(id));
  if (missing.length && !card.partial) {
    problems.push(
      `The card covers ${seen.size} of ${required.length} evals. A partial run is not a score: `
      + `run the rest, or set "partial": true and it will be marked rather than ranked. `
      + `Missing: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ` and ${missing.length - 5} more` : ""}.`,
    );
  }

  for (const p of pillarIds) {
    const s = card.pillars?.[p];
    if (!s || !Number.isInteger(s.pass) || !Number.isInteger(s.total)) {
      problems.push(`"pillars.${p}" must be {pass, total}. Use suievals/score.js, which computes them.`);
    }
  }

  return problems;
}

/**
 * Things worth saying about a card that do not make it invalid.
 *
 * A manifest mismatch used to be a problem, and the message it printed offered
 * submission as an option -- "Re-run, or submit it knowing the board will mark
 * it as an older eval set" -- while the validator that printed it exited 1 and
 * blocked the pull request. Three parts of this system treat a stale card as
 * something to label: build.js sets staleManifest, the page says "Scored against
 * an older eval set", and this message says so too. Only the exit code
 * disagreed, and the result was that every pull request touching suievals/ was
 * red because of 24 cards measured before #106 renamed the suite.
 *
 * A stale card is still not ranked -- build.js refuses it on coverage, because
 * its ids no longer join. That is the protection. Failing CI as well protected
 * nothing and hid real failures behind a permanent one.
 */
export function cardWarnings(card, { manifest: suite }) {
  const warnings = [];
  if (card.manifest !== suite) {
    warnings.push(
      `Scored against suite "${card.manifest}"; the suite is now "${suite}". The board will mark `
      + `this as an older eval set and will not rank it. Re-run to have it scored against the current suite.`,
    );
  }
  return warnings;
}
