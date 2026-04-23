# Configurable Task Schema via Frontmatter

## Overview

Add YAML frontmatter to `TASKS.md` that lets users customize task ID format, allowed field values, and defaults. Validation enforces configured values. `md-task init` generates a full frontmatter template.

## Frontmatter Format

```yaml
---
id:
  prefix: TASK
  separator: '-'
fields:
  priority: [critical, high, medium, low]
  type: [feature, bug, task, chore]
  status: [todo, in-progress, done, cancelled]
  scope: [frontend, backend, infra]
defaults:
  priority: medium
  type: task
  status: todo
  scope: frontend
---
```

All sections optional. Missing sections use hardcoded defaults.

## ID Schema

- Internal ID: always numeric (auto-increment, same as current)
- Display format: `{prefix}{separator}{number}` — e.g. `TASK-1`
- Heading: `### TASK-1` (not `### Task 1`)
- Default prefix: `Task`, default separator: ` ` (space) — matches current format
- `nextId()` unchanged — returns next integer
- New `formatId(id, config)` → `"TASK-1"`
- New `parseId(heading, config)` → extracts numeric ID from heading string

## Config Type

```typescript
interface IdConfig {
  prefix: string;
  separator: string;
}

interface TaskConfig {
  id: IdConfig;
  fields: {
    priority: string[];
    type: string[];
    status: string[];
    scope: string[] | null; // null = freeform
  };
  defaults: {
    priority: string;
    type: string;
    status: string;
    scope: string;
  };
}
```

## Config Resolution

1. Parse frontmatter from `TASKS.md`
2. Merge with hardcoded defaults (frontmatter values take precedence)
3. Validate: each default must exist in its corresponding fields array
4. Pass config through `TaskFile` to all consumers

When no frontmatter present: use hardcoded defaults (same behavior as today).

## Validation Rules

- `fields.priority` / `fields.type` / `fields.status`: strict enum. Reject values not in array.
- `fields.scope`: strict enum when defined. When absent from frontmatter, scope remains freeform.
- `defaults.*`: each default value must exist in corresponding `fields` array (config validation error otherwise).
- Sort/priority ordering: array order defines rank. First element = highest priority / most active status.

## Impact on Existing Code

### New File: `src/core/config.ts`

- `TaskConfig` interface
- `DEFAULT_CONFIG` constant (current hardcoded values)
- `parseConfig(yamlObj)` → `TaskConfig` (merge with defaults)
- `validateConfig(config)` → throws on invalid defaults
- `formatId(id: number, config: TaskConfig)` → `string`
- `parseIdFromHeading(heading: string, config: TaskConfig)` → `number | null`

### Modified: `src/core/parser.ts`

- Extract frontmatter (between `---` markers) before parsing tasks
- Parse YAML frontmatter → raw object
- Pass to `parseConfig()` to get `TaskConfig`
- `TaskFile` gains `config: TaskConfig` field
- Heading regex built from config: `### {prefix}{sep}(\d+)`
- `serializeTaskFile` writes frontmatter back, then tasks

### Modified: `src/core/task.ts`

- `PRIORITIES`, `TYPES`, `STATUSES` remain as `DEFAULT_*` constants
- `isValidPriority` / `isValidType` / `isValidStatus` gain optional config param
- `applyDefaults` uses config defaults instead of hardcoded
- Remove `Priority`, `TaskType`, `Status` branded types — fields become `string` since values are user-defined

### Modified: `src/core/id.ts`

- No changes to `nextId()` — still returns max+1

### Modified: All Commands

- Parse file → get `TaskFile` with `config`
- Pass config to validation functions
- `list --sort priority`: use `config.fields.priority` array order
- `list --sort status`: use `config.fields.status` array order
- `next`: filter by config-aware "actionable" statuses (not last two in status array, which are terminal states like done/cancelled)

### Modified: `src/commands/init.ts`

- Always generate frontmatter with hardcoded defaults as template
- Output includes `---` block + `# Tasks` header

### Modified: `src/shared/output.ts`

- No changes needed — formatters don't reference enums

### Modified: `src/shared/errors.ts`

- Add `configError(message)` factory for config validation failures

## `next` Command: Actionable Status Logic

With custom statuses, "actionable" can't be hardcoded to `todo` / `in-progress`. New rule:

- Terminal statuses: last N statuses in the array that semantically represent "finished" states
- Simpler approach: define convention that the **last two** statuses in the array are terminal (done, cancelled equivalents)
- Even simpler: add `terminal` list to frontmatter config

Going with simplest: terminal statuses are statuses that `next` should skip. By convention, tasks with the last status in the `fields.status` array are skipped. But this is fragile.

**Decision:** Add optional `terminal` array under `fields`:

```yaml
fields:
  status: [backlog, todo, in-progress, review, done, cancelled]
  terminal: [done, cancelled]
```

When `terminal` not specified, default to `["done", "cancelled"]`. `next` skips tasks with terminal status.

## Fixture Update

`tests/fixtures/valid.md` becomes:

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
type:bug, priority:high, scope:backend, status:todo, created:2026-04-23, updated:2026-04-23

### Task 2

Add caching layer
type:feature, priority:medium, scope:general, status:in-progress, created:2026-04-23, updated:2026-04-23

### Task 3

Refactor auth module
type:chore, priority:low, scope:backend, status:done, created:2026-04-22, updated:2026-04-22
```

## Dependencies

- Add `yaml` package (runtime dependency) for frontmatter parsing

## What Stays the Same

- Tag line format (`key:value, key:value`)
- Extra lines / notes system
- `--file`, `--format`, `--quiet` flags
- `--depends-on` behavior
- `batch` command interface (uses same validation)
- Exit codes (0/1/2)
- `search` command behavior
- `stats` command (adapts to config field names)
