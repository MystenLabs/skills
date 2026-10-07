# Deploying the board

The page is static: `suievals/index.html` plus two JSON files it fetches by
relative path, `evals/index.json` and `results/index.json`. Those paths are
relative, so **`suievals/` has to be the web root** — serving the repository root
gives a page that renders its shell and then fails both fetches.

## Vercel

`vercel.json` at the repository root does this with `outputDirectory: suievals`.
Nothing needs configuring in the dashboard beyond connecting the repository.

The board is rebuilt during the deploy rather than served from whatever was last
committed:

```
node suievals/build.js --skills . --out suievals
```

That matters because the board is a function of the cards *and the skills they
were scored against*. A card merged without a rebuild, or a skill edited without
one, would otherwise publish a page that disagrees with the repository it came
from. Building on deploy makes that impossible rather than merely unlikely.

The build runs the three suites after it (`build.test.js`, `kind.test.js`,
`page.test.mjs`), so a deploy fails rather than publishing a board that does not
pass its own checks.

`installCommand` is a no-op on purpose. `build.js` imports nothing outside the
Node standard library and the repository's own `suievals/lib`, so installing the
root `package.json` dependencies — the Anthropic SDK and `glob`, both for the
eval runners — would add time and supply-chain surface to a static build that
cannot use them.

### Caching

`evals/index.json` and `results/index.json` are served `must-revalidate`. The
page fetches them with `cache: 'no-cache'`, which governs the browser and not
the CDN; without the header a merged card could be invisible for as long as the
edge held the old copy. The per-run record pages under `runs/` are immutable
once written and carry a short cache.

## Locally

`evals/index.json` and `results/index.json` are generated and not committed, so a
fresh clone has nothing to serve until it builds:

```sh
node suievals/build.js --skills . --out suievals
```

The tests say so themselves if you forget. They were committed once, went stale,
and stayed stale -- `evals/index.json` claimed 158 evals and manifest
`143c0d0525d3` while the suite was 156 and `f0b70209ffb6` -- because the job that
refreshed them pushed to a protected branch and could never land.

## What a deploy does not do

It does not run evals, score anything, or call a model. The numbers come from
the cards in `suievals/results/`, which arrive by pull request. A deploy only
rebuilds the page from cards that are already in the repository.
