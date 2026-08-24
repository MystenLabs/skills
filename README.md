# Mysten Labs Agent Skills

Reusable agent skills for building on Sui. Install them into Claude Code, Cursor, Codex, and [40+ other AI coding agents](https://skills.sh) via the `skills` CLI.

## Install

```bash
# Browse available skills
npx skills add mystenlabs/skills --list

# Install a specific skill
npx skills add mystenlabs/skills --skill sui-move

# Install a starter set (recommended for new devs)
npx skills add mystenlabs/skills --skill sui-overview --skill sui-move --skill sui-move-project

# Install all skills
npx skills add mystenlabs/skills --all
```

> **New to Sui?** Start with the three-skill starter set above (`sui-overview`, `sui-move`, `sui-move-project`). Installing all 26 skills adds real context overhead and can cause trigger collisions. Add more as you need them.

## Skills

### Get started

| Skill | Description |
|-------|-------------|
| [sui-overview](sui-overview/) | High-level overview of Sui, the object model, and the Sui Stack |
| [sui-move](sui-move/) | Sui Move smart contract development — abilities, TxContext, OTW, events, coins |
| [sui-move-project](sui-move-project/) | Move project setup, Move.toml configuration, and dependency management |

### Move development

| Skill | Description |
|-------|-------------|
| [composable-move-functions](composable-move-functions/) | Function visibility, parameter ordering, and return patterns |
| [modern-move-syntax](modern-move-syntax/) | Move 2024 edition syntax — method calls, string literals, loops |
| [naming-conventions](naming-conventions/) | Naming rules for structs, constants, events, capabilities, and keys |
| [move-unit-testing](move-unit-testing/) | Writing unit tests for Move smart contracts |
| [object-model](object-model/) | Ownership types, dynamic fields, collections, transfer patterns |
| [sui-build-test](sui-build-test/) | Building Move code with `sui move build` |

### Tooling and deployment

| Skill | Description |
|-------|-------------|
| [sui-install](sui-install/) | Installing and managing Sui CLI versions with suiup |
| [sui-cli](sui-cli/) | Sui networks, gas costs, epochs, and network operations |
| [sui-client](sui-client/) | CLI client configuration, address management, and faucet tokens |
| [sui-publish](sui-publish/) | Publishing, upgrading, and deploying Move packages |

### SDKs and frontend

| Skill | Description |
|-------|-------------|
| [sui-sdks](sui-sdks/) | SDK landscape — TypeScript, Rust, Python, Go, and more |
| [ptbs](ptbs/) | Programmable Transaction Blocks — composing atomic transactions |
| [frontend-apps](frontend-apps/) | dApp development with @mysten/dapp-kit (React, Vue, vanilla JS) |
| [accessing-data](accessing-data/) | Reading on-chain state — gRPC, GraphQL, indexers, Walrus blobs |

### DeepBook

| Skill | Description |
|-------|-------------|
| [deepbook-overview](deepbook-overview/) | DeepBook V3 architecture, contract addresses, and key concepts |
| [deepbook-sdk](deepbook-sdk/) | DeepBook V3 TypeScript SDK — trading, orders, swaps |
| [deepbook-move](deepbook-move/) | DeepBook V3 Move integration — on-chain orders, flash loans |
| [deepbook-margin](deepbook-margin/) | DeepBook margin/leveraged trading |
| [deepbook-predict](deepbook-predict/) | DeepBook Predict — prediction markets (Testnet only) |

### Walrus

| Skill | Description |
|-------|-------------|
| [walrus-sites](walrus-sites/) | Decentralized website hosting on Walrus Sites |

### Other

| Skill | Description |
|-------|-------------|
| [generate-sui-agent-config](generate-sui-agent-config/) | Generate CLAUDE.md or AGENT.md for Sui projects |

## Repo Structure

Each skill is a directory at the repo root containing a `SKILL.md` and supporting reference files:

```
├── sui-move/
│   ├── SKILL.md
│   ├── abilities-context.md
│   ├── events-coins.md
│   └── evals/
│       └── evals.json
├── sui-sdks/
│   ├── SKILL.md
│   ├── typescript.md
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