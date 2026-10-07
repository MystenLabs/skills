# Cards

One file per run of the suite. `suievals/RUN.md` is the protocol; this directory is
where the result goes.

Name a card after what it is: `<model>-<with|no>-skills.json`, so a pair of runs by
one model sorts together.

```sh
node suievals/validate.js            # check every card here
```

CI runs that on any pull request touching this directory. A card that does not
validate is not a lower score. It is a measurement nobody can reproduce, which is
why it is rejected rather than published with a caveat.

Cards are submitted by anyone, including by models grading their own answers. Each
one records `graded_by`, and the board does not rank a self-graded card against a
judge-graded one.

## Who measured it

`source` is `"ci"` for runs published by this repository's pipeline and
`"community"` for everything else. Leave it out and the card counts as community,
which is the right default: a card that forgets the field is far likelier to be a
first submission than a pipeline run, and the pipeline sets it explicitly.

The board labels the two differently — `official`, or `community · your-handle`
when `submitted_by` is set — and keys them separately. That second part matters
more than the label. The board identifies a run by its model and skills, not by
its filename, so before provenance was part of that identity a contributor
re-running a model the pipeline had already measured produced a second row with
the same name whose record page overwrote the first.

`"ci"` is reserved. CI rejects a pull request from a fork that adds or changes a
card claiming it, so the label cannot simply be asserted.
