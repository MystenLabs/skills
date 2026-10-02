# Run Sui Evals on yourself

158 questions a Sui developer would actually type, each one written from a mistake
seen in real model output and cited to the documentation page it grades against.
This file is the whole protocol. If you are an agent with a shell, you can follow it
start to finish without asking anyone anything.

The point of the exercise is not your rank. It is the gap between what you answer
with nothing in context and what you answer with the Sui skills loaded — that gap is
the only number here that says anything about whether Sui is documented well.
**So run it twice.**

Two ways to finish: **submit your answers** and let the same judge that grades every
other run grade yours, or grade them yourself. The first is a row on the board. The
second is a row beside it, labelled self-graded, that nothing can be compared with.

---

## 1. See the suite

```sh
node suievals/list.js                  # the worklist, grouped by pillar
node suievals/list.js --skill ptbs     # one skill
node suievals/list.js --json           # machine-readable
```

Each eval has a qualified id — `object-model/1`, `ptbs/ptbs-gas-coin-misuse` — a
prompt, and a numbered list of expectations. **Ids are qualified because twenty
skills number their evals 1, 2, 3.** Scoring anything by a bare id silently merges
different questions.

## 2. Answer every prompt

Answer each `Q:` as you would answer a developer who asked it. Prose and code, the
length a real reply takes. Do not look at the expectations until you have written
the answer, and do not fetch the cited source pages — this measures what you know
and what the skill in your context taught you, not what you can retrieve.

**Run 1 — baseline.** Nothing about Sui in your context. No skill files, no
`CLAUDE.md` that mentions Sui, no earlier turns in this conversation about Sui.

**Run 2 — with the skills.** Before answering a skill's evals, read that skill's
`SKILL.md` and every other `.md` beside it, and keep them in context while you
answer. `ptbs/4` is answered with `ptbs/` loaded, not with all thirty skills loaded —
the suite asks whether *that* skill teaches *that* answer.

## 3. Submit the answers, not a grade

**This is the path that gets you on the board.** Put what your model said into an
answers file and let the same judge that grades every other run grade yours.

```sh
node suievals/list.js --answers > my-answers.json
```

Fill in one answer per eval id, set `model` (`claude-opus-5`), `skills` (`none` for
run 1, `sui-skills` for run 2) and `submitted_by`, then:

```sh
node suievals/validate.js my-answers.json
cp my-answers.json suievals/results/claude-opus-5-with-skills.answers.json
```

Open a pull request with both answers files. A maintainer runs the judge over them
and commits the resulting cards. The grading costs money per eval, so it is a manual
step rather than something a pull request triggers — but the card it produces is in
**the same grading regime as every run already on the board**, which is what makes
it rank rather than sit beside the ranking.

`validate.js` checks the answers before any of that: an id that is not in the suite,
an eval left unanswered, or a file where most answers are empty. A run where the
model said nothing is not a run that scored badly, and it is worth finding that out
before 158 judge calls rather than after.

## 4. Or grade it yourself

You can, and the result is published, and it will not be ranked.

```sh
node suievals/list.js --template > my-grades.json     # one boolean per expectation
node suievals/score.js --grades my-grades.json
```

Fill in each array. An expectation is satisfied or it is not; there is no partial
credit inside one. Grade strictly: "mentions X" means the answer says X, not that it
says something adjacent to X. If an eval carries a `graders` entry, those
expectations have a written pattern and are settled by matching it, with no opinion
involved. Set `graded_by` to `self`, `human`, or `judge:<model>`.

**A model marking its own paper is the easier of two measurements**, so the board
keeps self-graded cards out of the judge-graded ranking and labels them. That is not
a punishment, it is the only honest thing to do with two different rulers — but it
does mean a self-graded card is a row nobody can read against anything. If you have
a second model to hand, `judge:<that model>` is better, and submitting the answers
is better still.

`score.js` prints the per-pillar report and the evals you missed, worst first. It
refuses a grades file whose arrays are the wrong length or whose ids are not in the
suite, because both produce a plausible number over a denominator nobody else has.

The score is **the mean of the four pillar scores**, not the pooled pass rate.
Building holds 82 of the 158 evals and Security 16, so pooling lets one pillar
decide the number and a weak security showing disappears into it.

```sh
node suievals/score.js --grades my-grades.json \
  --out suievals/results/claude-opus-5-with-skills.json \
  --submitted-by your-github-handle
node suievals/validate.js
```

The card records the suite's fingerprint either way, so a run made before the evals
changed is marked as against an older set rather than silently compared with a
current one.

---

## What a card contains

```json
{
  "suievals_card": 1,
  "model": "claude-opus-5",
  "skills": "sui-skills",
  "harness": "self-report",
  "graded_by": "self",
  "manifest": "143c0d0525d3",
  "recorded_at": "2026-10-02T15:00:00.000Z",
  "submitted_by": "your-github-handle",
  "pillars": { "objects": { "pass": 119, "total": 174 }, "…": {} },
  "total": { "pass": 613, "total": 896 },
  "evals": [{ "id": "object-model/1", "pass": 4, "of": 6 }]
}
```

`score.js` writes it. Writing one by hand is possible and not advised: the pillar
totals have to agree with the per-eval rows, and `validate.js` will tell you when
they do not.

## Things worth knowing before you argue with a result

- **An eval you fail may be a bad eval.** Every expectation is supposed to be
  sourced — written from a documentation page, with that page linked on the eval. If
  an expectation is not supported by the page it cites, that is a bug in the suite.
  Open an issue or a pull request against the eval. Several have been rewritten this
  way.
- **The pillars are uneven** because the evals were written per skill and grouped
  afterwards. Scoring averages the four, so the unevenness does not reach the score.
- **`walrus-sites/portal` and `walrus-sites/publishing` are not in the suite.** They
  nest their evals a level deeper than discovery reaches — 11 evals between them. See
  the note in `suievals/lib/suite.js`; folding them in changes the suite fingerprint
  and invalidates every card already submitted, so it is a deliberate decision rather
  than a tidy-up.
- **Nothing in this directory calls a model.** These scripts read files and do
  arithmetic. You are the model under test. The one thing that does call a model is
  the judge, which runs on a maintainer's machine over submitted answers.
- **Ids are ugly today.** 111 of the 158 evals are identified by their position in
  their skill's file — `object-model/7` — because they were written without names.
  They are qualified by skill, so nothing collides, but the number means nothing and
  will change if an eval is inserted before it. Naming every eval is in flight.
