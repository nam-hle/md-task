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
    task.ts             # Task type with depends/updated fields, validation, defaults
    parser.ts           # Markdown ↔ Task[] (parseTaskFile / serializeTaskFile)
    id.ts               # Auto-increment ID from existing tasks
  commands/
    add.ts              # Add new task (--depends-on, --quiet)
    list.ts             # List/filter tasks (--sort, --status todo,done, --quiet)
    update.ts           # Update task fields (--note, --depends-on, --quiet)
    remove.ts           # Remove by ID
    view.ts             # View single task
    init.ts             # Create empty TASKS.md
    done.ts             # Shortcut: mark task done
    start.ts            # Shortcut: mark task in-progress
    next.ts             # Highest-priority actionable task (skips blocked)
    search.ts           # Case-insensitive keyword search
    stats.ts            # Summary counts by status/priority/blocked
    batch.ts            # Bulk ops via JSON stdin
    status-shortcut.ts  # Shared factory for done/start commands
  shared/
    file.ts             # fs read/write/exists wrappers
    output.ts           # Tab-delimited compact + detail formatters, JSON output
    errors.ts           # MtaskError with exit codes (0=ok, 1=error, 2=not-found)
```

**Data flow**: All commands follow the same pattern — read `TASKS.md` → `parseTaskFile()` → mutate `TaskFile` → `serializeTaskFile()` → write back. Parser splits on `### Task N` headings; each block has a description line, a comma-separated tag line (`type:feature, priority:high, scope:api, status:todo, created:2025-01-01, updated:2025-01-01, depends:3,5`), and optional extra lines (notes prefixed with `>`).

**Output modes**: Every command supports `--format text|json` and `-q/--quiet` (minimal machine output — just IDs).

**File path**: Every command accepts `--file <path>` defaulting to `TASKS.md`.

**Task dependencies**: Tasks can declare `--depends-on 3,5`. The `next` command skips blocked tasks (deps not done). `stats` reports blocked count.

**Batch operations**: `batch` reads JSON array from stdin, supports add/update/remove/done/start actions, reports per-action success/failure.

## Testing

Tests use vitest with globals enabled. All tests are in `tests/unit/` mirroring src structure. Tests use temp directories via `mkdtemp` for file I/O — no mocking of the filesystem. Batch tests mock `process.stdin` with `Readable` stream.

## CI

GitHub Actions runs typecheck → build → test on Node 22 and 24 against master.
