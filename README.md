# md-task

CLI for managing tasks as markdown files, optimized for AI agent token usage.

Tasks live in a plain `TASKS.md` file that's human-readable and version-control friendly. Every command supports `--format json` and `--quiet` modes so AI agents can parse output without wasting tokens.

## Install

```bash
# Requires Node.js >= 22
pnpm install
pnpm build

# Link globally (optional)
pnpm link --global
```

## Quick Start

```bash
# Initialize a tasks file
md-task init

# Add tasks
md-task add "Fix login timeout" --priority high --type bug --scope backend
md-task add "Add caching layer" --type feature
md-task add "Write tests for auth" --depends-on 1

# Work on tasks
md-task next                          # Show highest-priority actionable task
md-task start 1                       # Mark as in-progress
md-task done 1                        # Mark as done

# View and filter
md-task list                          # All tasks
md-task list --status todo,in-progress --sort priority
md-task view 1
md-task search "login"

# Update tasks
md-task update 2 --priority critical
md-task update 2 --note "tried redis, too complex"

# Summary
md-task stats
```

## File Format

`TASKS.md` has YAML frontmatter (schema config) followed by markdown task blocks:

```markdown
---
id:
  prefix: Task
  separator: ' '
fields:
  priority: [critical, high, medium, low]
  type: [feature, bug, task, chore]
  status: [todo, in-progress, done, cancelled]
  terminal: [done, cancelled]
defaults:
  priority: medium
  type: task
  status: todo
  scope: general
---

# Tasks

### Task 1

Fix login timeout
type:bug, priority:high, scope:backend, status:todo, created:2025-01-15, updated:2025-01-15

### Task 2

Add caching layer
type:feature, priority:medium, scope:general, status:in-progress, created:2025-01-15, updated:2025-01-16, depends:1

> tried redis, too complex
> switching to in-memory LRU
```

Each task block has:

- **Line 1**: Description
- **Line 2**: Comma-separated tags (`type`, `priority`, `scope`, `status`, `created`, `updated`, optionally `depends`)
- **Remaining lines**: Notes (conventionally prefixed with `>`)

## Schema Customization

The frontmatter defines your project's task schema. `md-task init` generates a template you can edit.

### Custom ID Format

```yaml
id:
  prefix: BUG
  separator: '-'
```

Produces headings like `### BUG-1`, `### BUG-2`.

### Custom Field Values

```yaml
fields:
  priority: [p0, p1, p2, p3]
  type: [feature, bug, task, chore, spike, epic]
  status: [backlog, todo, in-progress, review, done, cancelled]
  scope: [frontend, backend, infra, docs]
  terminal: [done, cancelled]
```

- **Strict validation**: only listed values are accepted
- **Array order = rank**: first priority is highest, first status is most active
- **`terminal`**: statuses that `next` skips (completed/cancelled equivalents)
- **`scope`**: omit from frontmatter to keep freeform (any string accepted)

### Custom Defaults

```yaml
defaults:
  priority: p1
  type: task
  status: backlog
  scope: backend
```

Applied when a field is omitted during `md-task add`.

## Commands

### Task Management

| Command                     | Description              |
| --------------------------- | ------------------------ |
| `md-task init`              | Create empty `TASKS.md`  |
| `md-task add <description>` | Add a new task           |
| `md-task update <id>`       | Update task attributes   |
| `md-task remove <id>`       | Remove a task            |
| `md-task done <id>`         | Mark task as done        |
| `md-task start <id>`        | Mark task as in-progress |

### Querying

| Command                  | Description                           |
| ------------------------ | ------------------------------------- |
| `md-task list`           | List all tasks with optional filters  |
| `md-task view <id>`      | View a single task                    |
| `md-task next`           | Show highest-priority actionable task |
| `md-task search <query>` | Search descriptions and notes         |
| `md-task stats`          | Summary counts by status/priority     |

### Bulk Operations

| Command         | Description                                 |
| --------------- | ------------------------------------------- |
| `md-task batch` | Execute multiple operations from JSON stdin |

## AI Agent Integration

md-task is designed to minimize token usage when called by AI agents (Claude Code, Cursor, Copilot, etc.).

### Output Modes

Every command supports three output modes:

```bash
md-task list                        # Human-readable text (default)
md-task list --format json          # Structured JSON
md-task list --quiet                # Minimal output (one ID per line)
```

### Quiet Mode (`-q`)

Returns just the essential data — no headers, no formatting:

```bash
md-task add "Fix bug" --quiet       # → "1"
md-task next --quiet                # → "3"
md-task list --status todo --quiet  # → "1\n3\n5"
md-task stats --quiet               # → "12"
```

### JSON Mode

Full structured output for programmatic consumption:

```bash
md-task list --format json
# → {"tasks":[...],"count":5}

md-task next --format json
# → {"task":{"id":1,"description":"...","priority":"high",...}}

md-task stats --format json
# → {"total":5,"byStatus":{"todo":2,"in-progress":1,...},"byPriority":{...},"blocked":1}
```

### Batch Operations

Perform multiple operations in a single call — reduces tool invocations:

```bash
echo '[
  {"action":"add","description":"Task A","priority":"high"},
  {"action":"done","id":3},
  {"action":"update","id":2,"status":"in-progress","note":"started work"},
  {"action":"remove","id":5}
]' | md-task batch
```

Output reports per-action success/failure:

```json
{
  "results": [
    { "index": 0, "action": "add", "ok": true, "id": 4 },
    { "index": 1, "action": "done", "ok": true, "id": 3 },
    { "index": 2, "action": "update", "ok": true, "id": 2 },
    { "index": 3, "action": "remove", "ok": true, "id": 5 }
  ]
}
```

Supported batch actions: `add`, `update`, `remove`, `done`, `start`.

### Smart Task Selection

`md-task next` returns the highest-priority actionable task:

- Prefers `in-progress` over `todo`
- Sorts by priority (critical > high > medium > low)
- Skips tasks blocked by unfinished dependencies
- Supports `--scope` and `--type` filters

### Dependencies

Tasks can declare dependencies that block execution:

```bash
md-task add "Deploy to prod" --depends-on 1,2
md-task next   # Skips this task until tasks 1 and 2 are done
md-task stats  # Reports blocked count
```

### Exit Codes

| Code | Meaning                                                 |
| ---- | ------------------------------------------------------- |
| `0`  | Success                                                 |
| `1`  | Error (validation, parse error)                         |
| `2`  | Not found (task/file not found, no results from `next`) |

### Filters

List supports multi-value comma-separated filters:

```bash
md-task list --status todo,in-progress
md-task list --priority critical,high --scope backend
md-task list --type bug,feature --sort priority
```

### Notes

Attach context to tasks for future sessions:

```bash
md-task update 3 --note "tried approach X, failed due to Y"
md-task update 3 --note "switching to approach Z"
```

Notes persist as `> ` prefixed lines in the markdown.

## Global Options

All commands accept:

| Option            | Description                                       |
| ----------------- | ------------------------------------------------- |
| `--file <path>`   | Path to tasks file (default: `TASKS.md`)          |
| `--format <type>` | Output format: `text` or `json` (default: `text`) |
| `-q, --quiet`     | Minimal machine-parseable output                  |

## Default Task Attributes

These are the defaults generated by `md-task init`. Customize via frontmatter.

| Attribute  | Default Values                             | Default   |
| ---------- | ------------------------------------------ | --------- |
| `priority` | `critical`, `high`, `medium`, `low`        | `medium`  |
| `type`     | `feature`, `bug`, `task`, `chore`          | `task`    |
| `status`   | `todo`, `in-progress`, `done`, `cancelled` | `todo`    |
| `scope`    | Freeform (any string)                      | `general` |

## Development

```bash
pnpm install
pnpm build          # Build
pnpm test           # Run tests
pnpm typecheck      # Type check
pnpm lint           # Lint
pnpm format         # Format
```

## License

MIT
