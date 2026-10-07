#!/usr/bin/env node
/**
 * Adding a baseline run must not move a capability figure.
 *
 * The page carries two kinds of number and they are easy to mix. A capability
 * figure says how well a model does the job, and only means anything over runs in
 * the configuration a developer would use -- the skills loaded. A comparison figure
 * says what the documentation is worth, and only means anything over a model run
 * both ways.
 *
 * Every figure was computed over "every run", which was correct for exactly as long
 * as every run was a with-skills run. The first baseline card breaks it silently:
 * "best minus worst" becomes the distance between the best model holding the
 * documentation and one that was never given it, under a caption about which model
 * to reach for, and the number moves with nothing on the page to say why. It went
 * from 53 points to 57 in the simulation that found this.
 *
 * So this runs the page's own renderers twice against the published results -- once
 * as they are, once with baseline cards added -- and asserts the capability figures
 * are identical and only the comparison figure appears.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUB = resolve(HERE, "..");
const html = readFileSync(join(PUB, "index.html"), "utf8");
const pageScript = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));

/**
 * The two index files are generated and not committed, so a fresh clone has to
 * build before it can test. Said plainly here, because the alternative is an
 * ENOENT on a path that looks like it should exist.
 */
function builtOrExplain(path) {
  if (existsSync(path)) return readFileSync(path, "utf8");
  console.error(
    `${path} is missing. It is generated, not committed -- build the board first:\n\n`
    + `  node suievals/build.js --skills . --out suievals\n`,
  );
  process.exit(1);
}

const cat = JSON.parse(builtOrExplain(join(PUB, "evals", "index.json")));
const results = JSON.parse(builtOrExplain(join(PUB, "results", "index.json")));

/** A baseline card: the same model with nothing in context, so it scores lower. */
function asBaseline(run, factor) {
  return {
    ...run,
    name: run.model,
    skill: "none",
    withSkills: false,
    pillars: Object.fromEntries(Object.entries(run.pillars).map(([k, v]) =>
      [k, { pass: Math.round(v.pass * factor), total: v.total }])),
    total: { pass: Math.round(run.total.pass * factor), total: run.total.total },
    // A bare model misses everything the with-skills run missed, and more besides.
    missed: cat.evals.map((e) => {
      const m = (run.missed ?? []).find((x) => x.id === e.id);
      return m
        ? { ...m, passed: Math.round(m.passed * factor) }
        : { id: e.id, pillar: e.pillar, skill: e.skill, passed: Math.round(e.expectations * factor), of: e.expectations };
    }).filter((m) => m.passed < m.of),
  };
}

let runCount = 0;

/** Run the page's script against a given results payload and read the figures. */
async function render(res) {
  const nodes = new Map();
  const created = [];
  const make = (id) => ({
    id, innerHTML: "", textContent: "", className: "", hidden: true,
    style: { setProperty() {} }, dataset: {},
    addEventListener() {}, appendChild(c) { created.push(c); }, setAttribute() {}, getAttribute: () => null,
    querySelector: () => make("x"),
    // Elements need this too, not just document: the install picker queries its own
    // children. Without it the hold path threw and the error landed in board-note,
    // which read as the page failing when it was the stub that was incomplete.
    querySelectorAll: () => [],
    classList: { toggle() {} },
  });
  globalThis.document = {
    getElementById: (id) => nodes.get(id) ?? (nodes.set(id, make(id)), nodes.get(id)),
    createElement: () => make("new"),
    querySelectorAll: () => [],
    documentElement: make("html"),
    body: make("body"),
  };
  globalThis.localStorage = { getItem: () => null, setItem() {} };
  Object.defineProperty(globalThis, "navigator", {
    value: { clipboard: { writeText: async () => {} } }, configurable: true,
  });
  globalThis.fetch = async (url) => ({
    ok: true, status: 200,
    // Matched on the path, not on a substring: the page fetches under /suievals/,
    // and "suievals/" contains "evals/", so url.includes("evals/") answered both
    // requests with the catalogue and the results never arrived. The page then
    // rendered its no-runs state and every assertion here passed vacuously.
    text: async () => JSON.stringify(url.endsWith("/evals/index.json") ? cat : res),
  });

  // A data: URL is the module's cache key, so importing the same script twice
  // returns the first evaluation and the second render silently reads the first
  // one's numbers -- which is a comparison that always passes.
  await import("data:text/javascript," + encodeURIComponent(`${pageScript}\n//${runCount++}`));
  await new Promise((r) => setTimeout(r, 150));

  const cardHtml = created.map((c) => c.innerHTML ?? "").join("\n");
  const cards = [...cardHtml.matchAll(/mc-name">([^<]+)</g)].map((m) => m[1]);
  const scores = Object.fromEntries(
    [...cardHtml.matchAll(/mc-name">([^<]+)<[\s\S]*?mc-best">(\d+)</g)].map((m) => [m[1], Number(m[2])]),
  );
  const figures = cards;
  // `tk` is a stat strip the page no longer has; kept as an empty list so the
  // shape of this object does not change under the assertions below.
  const strip = [...(nodes.get("tk")?.innerHTML ?? "").matchAll(/<b>([^<]*)<\/b>/g)].map((m) => m[1]);
  return {
    figures, cards, scores, strip,
    suiteSize: nodes.get("suite-size")?.textContent ?? "",
    delta: nodes.get("delta-note")?.textContent ?? "",
    board: nodes.get("board-note")?.textContent ?? "",
  };
}

// The published results may be on hold, which renders every measurement as a dash.
// These assertions are about the figure logic, so they render the live page; hold
// mode is checked separately at the end.
const live = { ...results, hold: undefined };

// An empty board is a legitimate state, not a failure. Every no-tools result was
// discarded once tools turned out to be worth 60 points on one skill, so the board
// is empty until the first tools run lands. Assert the empty state and stop, rather
// than failing on figures that cannot exist.
if (!live.runs.length) {
  const empty = await render(live);
  // What the empty state owes a reader: say there is nothing yet, show no model
  // cards, and still state the size of the suite -- which is knowable without a
  // single run.
  //
  // This used to assert one *figure*, reading `figures`, which is the list of
  // model cards on the board. With no runs there are none, so it asserted that
  // an empty board renders one model card and failed on every build after the
  // cards went stale. It also read a `tk` stat strip that the page no longer
  // has, so `strip` was always empty and the assertion that used it could only
  // ever have passed vacuously.
  assert.equal(empty.cards.length, 0,
    "an empty board renders no model cards");
  assert.match(empty.board, /No runs recorded yet|re-measured/i,
    "and says so rather than rendering an empty table");
  assert.equal(empty.suiteSize, String(cat.evals.length),
    "the suite size is knowable with no runs, so the hero still states it");
  console.log("page: no runs recorded, empty state renders and the rest is not asserted");
  process.exit(0);
}

const before = await render(live);
const after = await render({
  ...live,
  runs: [
    ...results.runs,
    // One of these deliberately scores below the weakest with-skills card, which is
    // the case that moved the spread.
    ...live.runs.filter((r) => ["claude-sonnet-5", "gpt-5.5", "claude-haiku-4-5-20251001"].includes(r.model))
      .map((r, i) => asBaseline(r, [0.62, 0.48, 0.3][i])),
  ],
});

// ── A baseline must not change what a model scored with the skills ─────────
//
// The hero figures this used to guard are gone: they were pooled numbers that a
// baseline could move, and the page now puts each model's configurations on one
// card instead. The invariant that replaces them is sharper. Adding a baseline
// adds a row inside that model's card and must not change the model's headline
// score, and it must never produce a second card for a model that already has
// one, which is how claude-opus-5 came to sit on the board twice at 98%.
assert.ok(after.cards.length > 0, "cards render");
assert.deepEqual(
  [...after.cards].sort(), [...new Set(after.cards)].sort(),
  `one card per model, got duplicates: ${after.cards.join(", ")}`,
);
assert.deepEqual(
  [...before.cards].sort(), [...after.cards].sort(),
  "a baseline joins an existing card rather than creating a new one",
);
for (const model of before.cards) {
  assert.equal(after.scores[model], before.scores[model],
    `${model}'s headline score is what it managed with the skills, and a baseline must not move it`);
}

// The "At a glance" strip and the layer chart below the cards are gone, and the
// assertions that guarded them went with them. What they were protecting -- that
// a baseline landing must not quietly move a capability number -- is covered
// above, on the cards, where the numbers now live.

// ── Hold mode shows the suite without the numbers ─────────────────────────
// Holding the board has to hide every measurement and keep everything that is not
// one. A page that held the question count or the skill list would be hiding facts
// that do not depend on any run; a page that showed a score would be publishing a
// number already known to be unreliable.
{
  const held = await render({ ...live, hold: true });
  // With the hero figures gone there is no number left on the first screen to
  // hold back, so holding the board means rendering no cards at all and saying
  // why. A card is a measurement; there is no partial version of one.
  assert.equal(held.cards.length, 0, "a held board renders no model cards");
  assert.match(held.board, /re-measured/i, "and the board says why rather than looking broken");
  assert.doesNotMatch(held.board, /No runs recorded yet/i,
    "which is not the same as claiming no run has ever happened");
}

console.log(`page: ${after.cards.length} model cards, one each, and a baseline never moves a headline score`);
console.log("page: on hold, no cards render and the board says why");
