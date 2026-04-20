---
name: set-up-sui-package
description: Use when creating a new Move package on Sui, setting up Move.toml, or starting any Sui smart contract project. Use when user mentions "new move project", "move package", "sui project setup", or when you need to create Move.toml and module files from scratch.
---

# setup-sui-package

## Overview

When creating a new Move package on Sui, AI agents consistently make three mistakes: using the outdated `"2024.beta"` edition, adding explicit framework dependencies that are now implicit, and using the legacy curly-brace module syntax. This skill provides the correct setup patterns.

All patterns sourced from https://move-book.com/guides/code-quality-checklist

## Move.toml Template

Always start with this exact template. Do not add a `[dependencies]` section:

```toml
[package]
name = "my_package"
edition = "2024"

[addresses]
my_package = "0x0"
```

### Why no `[dependencies]` section?

Since Sui 1.45, Sui, Bridge, MoveStdlib, and SuiSystem are imported implicitly. Do NOT add:

```toml
# WRONG — do not add this
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }
```

### Why `"2024"` not `"2024.beta"`?

The `"2024.beta"` edition was a pre-release version. The stable edition is `"2024"`. Always use `"2024"`.

### Named address prefix

Use a project-specific prefix for named addresses to avoid conflicts in multi-package projects:

```toml
# Bad — generic, can conflict
[addresses]
math = "0x0"

# Good — project-specific
[addresses]
my_protocol_math = "0x0"
```

## Module Syntax

Use the single-line module declaration without curly braces. This is the 2024 edition syntax:

```move
// WRONG — legacy syntax, increases indentation
module my_package::my_module {
    public struct A {}
}

// CORRECT — 2024 edition syntax
module my_package::my_module;

public struct A {}
```

## Quick Reference

| Setting | Correct | Common mistake |
|---------|---------|----------------|
| Edition | `edition = "2024"` | `edition = "2024.beta"` |
| Dependencies | No `[dependencies]` section | Adding explicit Sui git dep |
| Module syntax | `module pkg::name;` | `module pkg::name { ... }` |
| Address naming | `my_project_name = "0x0"` | `name = "0x0"` |
