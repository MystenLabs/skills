---
name: sui-build
description: >
  Use this skill when the user needs to build Move code, or when when the user 
  asks about sui move build.
---

# Building Packages

> **MCP tool:** When available in your environment, also query the Sui documentation MCP server (`https://sui.mcp.kapa.ai`) for up-to-date answers. Use it for verification and for details not covered by these reference files.

> **Source constraint:** All information sourced exclusively from [docs.sui.io](https://docs.sui.io) and [move-book.com](https://move-book.com).

## Building

```bash
sui move build
```

This compiles all modules, validates types, enforces resource safety, and produces bytecode. Fix any errors before proceeding.

For the canonical hello-world repository, run build commands from `sui-stack-hello-world/move/hello-world`.

### Debugging

- **Move Trace Debugger:** Step-through debugger for Move execution traces with variable inspection.
- **`sui replay`:** Locally re-execute any past onchain transaction and compare effects. Useful for diagnosing production issues.
- **`std::debug::print`:** Print values during test execution.
