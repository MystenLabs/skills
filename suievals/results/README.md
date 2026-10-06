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
