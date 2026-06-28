# Mysten Labs Agent Skills

Reusable agent skills for building on Sui. Install them into Claude Code, Cursor, Codex, and [40+ other AI coding agents](https://skills.sh) via the `skills` CLI.

## Install

```bash
# Browse available skills
npx skills add mystenlabs/skills --list

# Install a specific skill
npx skills add mystenlabs/skills --skill move

# Install all skills
npx skills add mystenlabs/skills --all
```

## Skills

| Skill | What it covers |
|-------|----------------|
| [`zklogin-enoki`](zklogin-enoki/) | Passwordless social login (zkLogin) and gasless onboarding for Sui apps with Enoki — `registerEnokiWallets` + dApp Kit, backend `EnokiClient`, and manual zkLogin. |
| [`sui-sponsored-transactions`](sui-sponsored-transactions/) | Sponsored / gasless transactions on Sui — the native sponsor + `GasData` dual-signature flow with the TypeScript SDK, plus the Enoki gas station, and the equivocation/locked-object risks. |

## Repo Structure

Each skill is a directory containing a `SKILL.md` and any supporting reference files:

```
skills/
├── move/
│   ├── SKILL.md
│   ├── syntax-ref.md
│   └── examples.md
├── sui-sdk/
│   ├── SKILL.md
│   └── ...
└── ...
```

Supporting files (anything that isn't `SKILL.md`) are bundled with the skill but only loaded by the agent when needed — they don't consume context upfront.

## Contributing

### Quick start

```bash
# Copy the template
cp -r template/ your-skill-name/

# Edit the skill definition
$EDITOR your-skill-name/SKILL.md

# Add supporting reference files
touch your-skill-name/setup.md
touch your-skill-name/core.md
touch your-skill-name/patterns.md
touch your-skill-name/examples.md

# Add evals
mkdir your-skill-name/evals
touch your-skill-name/evals/evals.json
```

### Steps

1. Create a new directory under the repo root: `your-skill-name/`
2. Add a `SKILL.md` with frontmatter:

```yaml
---
name: your-skill-name
description: What this skill does and when to use it. Be specific — this is what the agent uses to decide whether to trigger the skill.
---
```

3. Add supporting files to the same directory as needed
4. Add evals to `your-skill-name/evals/evals.json` (see [Evals](#evals) below)
5. Open a PR

### Checklist

- [ ] Replace `name` and `description` in SKILL.md frontmatter
- [ ] Write a clear opening paragraph describing what the skill covers
- [ ] Create reference files for each section listed under "Reference files"
- [ ] Update the routing guide table to match your actual reference files
- [ ] Edit or remove the "Sui-specific reminders" section as needed
- [ ] Add evals to validate the skill produces correct output
- [ ] Open a PR

### Evals

Every new skill must include evals. Evals verify that the skill produces correct, reliable output and prevent regressions as the skill evolves. PRs without evals will not be merged.

Place an `evals/evals.json` file in your skill directory:

```json
[
  {
    "id": "your-skill-basic",
    "prompt": "A realistic prompt a user would give the agent",
    "sources": [
        "https://source-1.com",
        "https://source-2.com"
        ],
    "expected_output": "Description of what correct output looks like",
    "expectations": [
      "Specific thing the output must include or satisfy",
      "Another requirement"
    ]
  }
]
```

When writing evals:
- Cover the core use cases your skill is designed to handle
- Use realistic prompts that match how a user would actually invoke the skill
- Include edge cases where the skill's domain has common pitfalls
- Each eval should test a distinct capability — avoid redundant prompts
- Each prompt should include a `sources` field that links out to documentation that should be used to verify the output of the eval. Sources can be set for individual prompts, or if the entire eval pulls from the same source, you can use the `source_constraint` heading at the top of the eval file. 

### Tips

- **Description is a trigger rule.** The `description` field in frontmatter determines when agents activate your skill. Write it like a conditional: "Use when X, Y, or Z."
- **SKILL.md routes, reference files teach.** Keep SKILL.md short — it tells the agent which files to load. Put the actual knowledge in reference files.
- **One skill per capability.** If two things have meaningfully different triggers, they should be separate skills.
- **Sui-first.** Assume the user is building on Sui. Call out where Sui differs from other chains or general-purpose patterns.

## Resources

- [skills.sh listing](https://skills.sh/mystenlabs/skills)
- [Agent Skills spec](https://github.com/vercel-labs/skills)
- [Sui Developer Docs](https://docs.sui.io)