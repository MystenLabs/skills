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

| Skill | Description |
|-------|-------------|
| [move](./move/) | Move smart contract development on Sui — syntax, object model, design patterns, and standard library. |

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

1. Create a new directory under the repo root: `your-skill-name/`
2. Add a `SKILL.md` with frontmatter:

```yaml
---
name: your-skill-name
description: What this skill does and when to use it. Be specific — this is what the agent uses to decide whether to trigger the skill.
---
```

3. Add supporting files to the same directory as needed
4. Open a PR

A few things that make skills work well:
- **Description as a trigger rule**, not a title — include the contexts and keywords that should activate it
- **`SKILL.md` for the core workflow** — move reference material, large docs, and examples into separate files
- **One skill per capability** — if it has a meaningfully different trigger, it should be its own skill

## Resources

- [skills.sh listing](https://skills.sh/mystenlabs/skills)
- [Agent Skills spec](https://github.com/vercel-labs/skills)
- [Sui Developer Docs](https://docs.sui.io)