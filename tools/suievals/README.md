# The measurement pipeline

Runs the suievals suite against a model and writes the cards the board reads.

```sh
npm install --prefix tools/suievals

SKILLS_DIR="$PWD" REPORTS_DIR=/tmp/reports \
  EVAL_MODEL=anthropic/claude-opus-5 EVAL_LAYER=with-skills \
  npx tsx tools/suievals/src/run-skills-eval.ts --samples 3

node tools/suievals/emit-cards.js --reports /tmp/reports --skills . --out suievals/results
```

`.github/workflows/suievals-measure.yml` does the same across a tier of models
and opens a pull request with the result.

## Why it is here

It was in a private repository, which made the board readable but not
reproducible: the suite, the page and the published cards were public and the
thing that produced the numbers was not. Anyone could check a card against the
suite and nobody outside the team could produce one the same way.

Two smaller things followed from the same split. A card had to cross a
repository boundary on a personal access token, and that token had no write
access here, so every publish returned 403 and an eval run went red on a
publishing failure rather than a measurement one. And the provider keys lived
next to seven other eval pipelines that have nothing to do with the board.

## What came across, and what did not

The import closure of `run-skills-eval.ts`, which is nine source files, not the
twenty-three in the directory it came from. The other fourteen belong to eval
types that do not produce cards -- the oracle, the competitor benchmark, routing,
onboarding, skill-edit proposals -- and those stay where they are.

Two tests stayed behind for the same reason. `mcp-verify.test.ts` is mostly about
`propose-skill-edits`, and `fact-check-honesty.test.ts` scans extensions that did
not move. The retrieval behaviour they shared with this package is covered by
`mcp-budget`, `mcp-off`, `on-topic` and `kapa-request-shape`, which did come.

## MCP retrieval is off

`MCP_ENABLED` is not set to `1` anywhere here and should not be. Measuring a
model does not need documentation retrieval, and an uncapped retrieval loop is
what produced a $15,000 overage on 3 October. The switch defaults to off at every
call site.
