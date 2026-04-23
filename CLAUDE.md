# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

mtask — CLI for managing tasks as markdown files, optimized for AI agent token usage. Tasks stored in `TASKS.md` (default) as markdown with `### Task N` headings and comma-separated tag lines.

## Commands

```bash
pnpm build          # Build with tsup (ESM, node22 target)
pnpm test           # Run all tests (vitest)
pnpm test -- tests/unit/commands/add.test.ts  # Run single test file
pnpm typecheck      # tsc --noEmit
pnpm lint           # ESLint (strict typescript-eslint + prettier compat)
pnpm format         # Prettier --write
pnpm format:check   # Prettier --check (CI-friendly)
```

## Architecture

```
src/
  index.ts              # CLI entry — commander program, registers all subcommands
  core/
    task.ts             # Task type, Priority/Status/TaskType enums, validation, defaults
    parser.ts           # Markdown ↔ Task[] (parseTaskFile / serializeTaskFile)
    id.ts               # Auto-increment ID from existing tasks
  commands/
    add|list|update|remove|view|init.ts  # Each exports createXCommand() → Command
  shared/
    file.ts             # fs read/write/exists wrappers
    output.ts           # Tab-delimited compact + detail formatters, JSON output
    errors.ts           # MtaskError with exit codes, factory functions
```

**Data flow**: All commands follow the same pattern — read `TASKS.md` → `parseTaskFile()` → mutate `TaskFile` → `serializeTaskFile()` → write back. Parser splits on `### Task N` headings; each block has a description line, a comma-separated tag line (`type:feature, priority:high, scope:api, status:todo, created:2025-01-01`), and optional extra lines.

**Output formats**: Every command supports `--format text|json`. Text format uses tab-delimited columns for lists, structured key-value for detail views.

**File path**: Every command accepts `--file <path>` defaulting to `TASKS.md`.

## Testing

Tests use vitest with globals enabled. All tests are in `tests/unit/` mirroring src structure. Tests use temp directories via `mkdtemp` for file I/O — no mocking of the filesystem.

## CI

GitHub Actions runs typecheck → build → test on Node 22 and 24 against master.
