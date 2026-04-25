---
name: md-task
description: "Manage tasks as markdown files using the md-task CLI. Use when the user wants to track tasks, create task lists, manage project work items, check task status, or plan work in a TASKS.md file. Covers adding, listing, updating, removing, moving, searching, and batch operations on markdown-based tasks with YAML frontmatter schema configuration."
argument-hint: "[add|list|move|update|next|stats|init|batch]"
allowed-tools: Bash(md-task *), Read, Grep, Glob
---

# md-task — Markdown Task Management

CLI for managing tasks as markdown files, optimized for AI agent token usage.

Tasks stored in `TASKS.md` (default) as markdown with YAML frontmatter (schema config) + `### {prefix}{sep}{id}` headings and comma-separated tag lines.

**ID format**: All commands taking an ID require the prefixed form (e.g., `T-130`, not `130`). Default prefix `T`, separator `-`. Configurable via frontmatter. `--depends-on` lists also require prefixed IDs (`T-3,T-5`).

## Commands

```bash
md-task init                          # Create TASKS.md with frontmatter template
md-task add "description"             # Add task (auto-increments ID)
md-task add "desc" --priority high    # Add with priority
md-task add "desc" --depends-on T-3,T-5   # Add with dependencies (prefixed IDs required)
md-task list                          # List all tasks
md-task list --status todo            # Filter by status
md-task list --sort priority          # Sort by priority/created/updated/status/id
md-task view <id>                     # View single task details (e.g. `md-task view T-1`)
md-task update <id> --priority high   # Update fields
md-task update <id> --note "text"     # Append note
md-task move <id> <status>            # Transition task status (validates transitions)
md-task move T-1 done                 # Mark done (replaces old `done` command)
md-task move T-1 in-progress          # Mark in-progress (replaces old `start` command)
md-task move T-1 done --force         # Bypass transition validation
md-task next                          # Highest-priority actionable task (skips blocked)
md-task search "keyword"              # Case-insensitive search
md-task stats                         # Summary counts by status/priority/blocked
md-task remove <id>                   # Remove task (e.g. `md-task remove T-1`)
md-task format                        # Reformat file after frontmatter edits (idempotent)
md-task format --check                # Exit 1 if file needs formatting (CI-friendly)
```

## Common Options

All commands accept:
- `--file <path>` — task file path (default: `TASKS.md`)
- `--format text|json` — output format
- `-q, --quiet` — minimal output (just IDs)

Status-changing commands (`move`, `update --status`) also accept:
- `--force` — bypass transition validation

## Batch Operations

Read JSON array from stdin. Supports add/update/remove/done/start actions:

```bash
echo '[{"action":"add","description":"task 1"},{"action":"done","id":3}]' | md-task batch
```

Note: batch `done`/`start` actions are retained as convenience aliases for `move`.

## Task Fields

- **description** — task text
- **priority** — configurable values (default: critical/high/medium/low)
- **status** — configurable values (default: todo/in-progress/done/cancelled)
- **type** — configurable values (default: feature/bug/task/chore)
- **scope** — configurable label (freeform by default)
- **depends-on** — comma-separated task IDs (blocks task from `next`)

## Status Transitions

Optional. Define allowed transitions in YAML frontmatter:

```yaml
transitions:
  todo: [in-progress, cancelled]
  in-progress: [review, todo, cancelled]
  review: [done, in-progress]
  done: []
  cancelled: []
```

- When `transitions` is absent, all status changes are allowed (backward compatible)
- When defined, `move` and `update --status` validate against the map
- `--force` bypasses validation for corrections
- Case-insensitive matching, preserves schema-defined casing

## Schema Configuration

YAML frontmatter in TASKS.md defines allowed values, defaults, ID prefix/separator, terminal statuses, and transitions. Run `md-task init` to generate template.

## Workflow Tips

- Use `md-task next` to pick work — respects priority and dependency blocking
- Use `md-task move <id> <status>` for all status changes
- Use `md-task stats` to check project state at a glance
- Use `--quiet` for scripting and piping IDs
- Use `--format json` for structured output
- Use `batch` for bulk operations (efficient for AI agents)
