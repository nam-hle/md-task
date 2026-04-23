# AI-Boost Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 12 features that make mtask optimally usable by AI agents — reducing round-trips, output tokens, and decision overhead.

**Architecture:** Features are grouped into 4 waves by dependency order. Wave 1 touches core types/parser (updated timestamp, dependencies, notes write-path). Wave 2 adds new commands (done/start, next, search, stats, batch). Wave 3 adds output/filtering enhancements (--quiet, --sort, multi-value filters). Wave 4 adds exit code semantics. Each wave commits independently.

**Tech Stack:** TypeScript, Commander.js, Vitest, tsup (ESM node22)

**Conventions from existing codebase:**

- Each command in `src/commands/<name>.ts` exports `create<Name>Command(): Command`
- All commands accept `--file <path>` (default `TASKS.md`) and `--format text|json`
- Tests in `tests/unit/commands/<name>.test.ts` use temp dirs via `mkdtemp`, spy on `console.log`/`console.error`
- Core types in `src/core/task.ts`, parser in `src/core/parser.ts`
- Output formatting in `src/shared/output.ts`
- Errors in `src/shared/errors.ts` with `MtaskError` class

---

### Task 1: Add `updated` timestamp to Task model

**Files:**

- Modify: `src/core/task.ts`
- Modify: `src/core/parser.ts`
- Modify: `src/commands/update.ts`
- Modify: `tests/fixtures/valid.md`
- Test: `tests/unit/core/parser.test.ts`

- [ ] **Step 1: Update Task interface and applyDefaults**

In `src/core/task.ts`, add `updated` field to `Task` interface:

```typescript
export interface Task {
  id: number;
  description: string;
  priority: Priority;
  scope: string;
  type: TaskType;
  status: Status;
  created: string;
  updated: string;
  extraLines: string[];
}
```

In `applyDefaults`, add `updated: today()` to the returned object (right after `created: today()`).

- [ ] **Step 2: Update parser to read/write `updated` tag**

In `src/core/parser.ts`, in `blockToTask` function, add after the `created` line (around line 92):

```typescript
created: tagMap.get('created') ?? new Date().toISOString().slice(0, 10),
updated: tagMap.get('updated') ?? tagMap.get('created') ?? new Date().toISOString().slice(0, 10),
```

In `taskToBlock`, add `updated` to the tags array:

```typescript
const tags = [
  `type:${task.type}`,
  `priority:${task.priority}`,
  `scope:${task.scope}`,
  `status:${task.status}`,
  `created:${task.created}`,
  `updated:${task.updated}`,
];
```

- [ ] **Step 3: Update `update` command to set `updated` timestamp**

In `src/commands/update.ts`, add before the `await writeTasksFile` call:

```typescript
task.updated = new Date().toISOString().slice(0, 10);
```

- [ ] **Step 4: Update valid.md fixture**

Replace `tests/fixtures/valid.md` with:

```markdown
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

- [ ] **Step 5: Update parser test to verify `updated` field**

In `tests/unit/core/parser.test.ts`, in the `'extracts task attributes correctly'` test, add:

```typescript
expect(task1.updated).toBe('2026-04-23');
```

- [ ] **Step 6: Update output formatters**

In `src/shared/output.ts`, add `updated` to `formatTaskDetail`:

```typescript
export function formatTaskDetail(task: Task): string {
  return [
    `Task ${task.id}`,
    `  Description: ${task.description}`,
    `  Priority:    ${task.priority}`,
    `  Scope:       ${task.scope}`,
    `  Type:        ${task.type}`,
    `  Status:      ${task.status}`,
    `  Created:     ${task.created}`,
    `  Updated:     ${task.updated}`,
  ].join('\n');
}
```

- [ ] **Step 7: Run tests, fix any failures**

Run: `pnpm test`

Expected: All tests pass. Some parser round-trip tests may need adjustment since serialized output now includes `updated`.

- [ ] **Step 8: Run lint + typecheck**

Run: `pnpm typecheck`
Run: `pnpm lint`

- [ ] **Step 9: Commit**

```
feat: add updated timestamp to tasks
```

---

### Task 2: Add `depends` field (task dependencies)

**Files:**

- Modify: `src/core/task.ts`
- Modify: `src/core/parser.ts`
- Modify: `src/commands/add.ts`
- Modify: `src/commands/update.ts`
- Test: `tests/unit/core/parser.test.ts`
- Test: `tests/unit/commands/add.test.ts`

- [ ] **Step 1: Add `depends` to Task interface**

In `src/core/task.ts`, add to `Task` interface:

```typescript
depends: number[];
```

Add to `TaskInput`:

```typescript
depends?: string; // comma-separated IDs like "3,5"
```

In `applyDefaults`, add:

```typescript
depends: input.depends
  ? input.depends.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
  : [],
```

- [ ] **Step 2: Update parser to read/write `depends`**

In `src/core/parser.ts`, in `blockToTask`, add after `updated`:

```typescript
depends: tagMap.get('depends')
  ? tagMap.get('depends')!.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
  : [],
```

Note: the `!` is safe here since we just checked `tagMap.get('depends')` is truthy. But to stay lint-clean, use:

```typescript
const dependsStr = tagMap.get('depends') ?? '';
// ... then:
depends: dependsStr
  ? dependsStr.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
  : [],
```

In `taskToBlock`, conditionally add `depends` to tags array (only if non-empty):

```typescript
const tags = [
  `type:${task.type}`,
  `priority:${task.priority}`,
  `scope:${task.scope}`,
  `status:${task.status}`,
  `created:${task.created}`,
  `updated:${task.updated}`,
];
if (task.depends.length > 0) {
  tags.push(`depends:${task.depends.join(',')}`);
}
```

Also add `'depends'` to the known tags list in `blockToTask`'s `hasKnownTag` check:

```typescript
const hasKnownTag = [...potentialTags.keys()].some((k) =>
  ['type', 'priority', 'scope', 'status', 'created', 'updated', 'depends'].includes(k),
);
```

- [ ] **Step 3: Add `--depends-on` option to add command**

In `src/commands/add.ts`, add option:

```typescript
.option('--depends-on <ids>', 'Comma-separated task IDs this depends on')
```

Pass to input:

```typescript
const input: TaskInput = {
  description: description.trim(),
  priority: opts.priority,
  scope: opts.scope,
  type: opts.type,
  status: opts.status,
  depends: opts.dependsOn,
};
```

- [ ] **Step 4: Add `--depends-on` option to update command**

In `src/commands/update.ts`, add option:

```typescript
.option('--depends-on <ids>', 'Comma-separated task IDs this depends on')
```

In the action handler, add before `task.updated = ...`:

```typescript
if (opts.dependsOn !== undefined) {
  task.depends = opts.dependsOn
    ? opts.dependsOn
        .split(',')
        .map((s: string) => parseInt(s.trim(), 10))
        .filter((n: number) => !isNaN(n))
    : [];
}
```

Also add `opts.dependsOn` to the "no update options" check:

```typescript
if (!opts.description && !opts.priority && !opts.scope && !opts.type && !opts.status && opts.dependsOn === undefined) {
```

- [ ] **Step 5: Write parser test for depends**

In `tests/unit/core/parser.test.ts`, add test:

```typescript
it('parses depends field', () => {
  const content =
    '# Tasks\n\n### Task 1\nFoo\ntype:task, priority:medium, scope:general, status:todo, created:2026-01-01, updated:2026-01-01, depends:2,3\n';
  const result = parseTaskFile(content);
  expect(result.tasks[0]!.depends).toEqual([2, 3]);
});

it('serializes depends field only when non-empty', () => {
  const content =
    '# Tasks\n\n### Task 1\nFoo\ntype:task, priority:medium, scope:general, status:todo, created:2026-01-01, updated:2026-01-01\n';
  const parsed = parseTaskFile(content);
  const serialized = serializeTaskFile(parsed);
  expect(serialized).not.toContain('depends:');
});
```

- [ ] **Step 6: Write add test for depends**

In `tests/unit/commands/add.test.ts`, add:

```typescript
it('adds task with dependencies', async () => {
  const program = buildProgram();
  await program.parseAsync([
    'node',
    'test',
    'add',
    '--file',
    file,
    '--depends-on',
    '1,2',
    'Dependent task',
  ]);

  const content = await readFile(file, 'utf-8');
  expect(content).toContain('depends:1,2');
});
```

- [ ] **Step 7: Run tests, lint, typecheck**

Run: `pnpm test`
Run: `pnpm typecheck`
Run: `pnpm lint`

- [ ] **Step 8: Commit**

```
feat: add task dependencies (--depends-on)
```

---

### Task 3: Add `--note` to update command (write path for extraLines)

**Files:**

- Modify: `src/commands/update.ts`
- Test: `tests/unit/commands/update.test.ts`

- [ ] **Step 1: Add `--note` option to update command**

In `src/commands/update.ts`, add option:

```typescript
.option('--note <text>', 'Append a note to the task')
```

In the action, add `opts.note` to the "no update options" check. Then add before `task.updated = ...`:

```typescript
if (opts.note) {
  task.extraLines.push(`> ${opts.note}`);
}
```

The `>` prefix makes notes visually distinct in markdown.

- [ ] **Step 2: Write test**

In `tests/unit/commands/update.test.ts`, add:

```typescript
it('appends note to task', async () => {
  const program = buildProgram();
  await program.parseAsync([
    'node',
    'test',
    'update',
    '1',
    '--file',
    file,
    '--note',
    'tried X, failed',
  ]);

  const content = await readFile(file, 'utf-8');
  expect(content).toContain('> tried X, failed');
});

it('appends multiple notes', async () => {
  const program = buildProgram();
  await program.parseAsync(['node', 'test', 'update', '1', '--file', file, '--note', 'note 1']);
  await program.parseAsync(['node', 'test', 'update', '1', '--file', file, '--note', 'note 2']);

  const content = await readFile(file, 'utf-8');
  expect(content).toContain('> note 1');
  expect(content).toContain('> note 2');
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm test`

- [ ] **Step 4: Commit**

```
feat: add --note option to update command
```

---

### Task 4: Add `done` and `start` shortcut commands

**Files:**

- Create: `src/commands/done.ts`
- Create: `src/commands/start.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/commands/done.test.ts`
- Test: `tests/unit/commands/start.test.ts`

- [ ] **Step 1: Create shared helper for status change**

Actually, `done` and `start` are thin wrappers. Each is a standalone command file to follow existing patterns. To avoid duplication, create a shared helper.

Create `src/commands/status-shortcut.ts`:

```typescript
import { Command } from 'commander';
import { parseTaskFile, serializeTaskFile } from '../core/parser.js';
import { readTasksFile, writeTasksFile, fileExists } from '../shared/file.js';
import { formatJson } from '../shared/output.js';
import { taskNotFound, fileNotFound, validationError } from '../shared/errors.js';
import type { Status } from '../core/task.js';

export function createStatusShortcut(name: string, targetStatus: Status): Command {
  return new Command(name)
    .description(`Mark task as ${targetStatus}`)
    .argument('<id>', 'Task ID')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .action(async (idStr: string, opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;
      const id = parseInt(idStr, 10);

      if (isNaN(id)) {
        throw validationError(`Invalid task ID: ${idStr}`);
      }

      if (!(await fileExists(filePath))) {
        throw fileNotFound(filePath);
      }

      const content = await readTasksFile(filePath);
      const taskFile = parseTaskFile(content);
      const task = taskFile.tasks.find((t) => t.id === id);

      if (!task) {
        throw taskNotFound(id);
      }

      task.status = targetStatus;
      task.updated = new Date().toISOString().slice(0, 10);

      await writeTasksFile(filePath, serializeTaskFile(taskFile));

      if (format === 'json') {
        console.log(formatJson({ task }));
      } else {
        console.log(`Task ${task.id} → ${targetStatus}`);
      }
    });
}
```

- [ ] **Step 2: Create done.ts and start.ts**

`src/commands/done.ts`:

```typescript
import { createStatusShortcut } from './status-shortcut.js';

export function createDoneCommand() {
  return createStatusShortcut('done', 'done');
}
```

`src/commands/start.ts`:

```typescript
import { createStatusShortcut } from './status-shortcut.js';

export function createStartCommand() {
  return createStatusShortcut('start', 'in-progress');
}
```

- [ ] **Step 3: Register in index.ts**

In `src/index.ts`, add imports and register:

```typescript
import { createDoneCommand } from './commands/done.js';
import { createStartCommand } from './commands/start.js';

// After other addCommand calls:
program.addCommand(createDoneCommand());
program.addCommand(createStartCommand());
```

- [ ] **Step 4: Write tests for done command**

Create `tests/unit/commands/done.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { createDoneCommand } from '../../../src/commands/done.js';

const FIXTURES = join(import.meta.dirname, '../../fixtures');

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createDoneCommand());
  return program;
}

describe('done command', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mtask-test-'));
    file = join(dir, 'TASKS.md');
    const fixture = readFileSync(join(FIXTURES, 'valid.md'), 'utf-8');
    await writeFile(file, fixture, 'utf-8');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it('marks task as done', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'done', '1', '--file', file]);

    const content = await readFile(file, 'utf-8');
    expect(content).toMatch(/### Task 1[\s\S]*status:done/);
  });

  it('outputs JSON when --format json', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'done', '1', '--file', file, '--format', 'json']);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.task.status).toBe('done');
  });

  it('errors on non-existent task', async () => {
    const program = buildProgram();
    await expect(
      program.parseAsync(['node', 'test', 'done', '999', '--file', file]),
    ).rejects.toThrow('Task 999 not found');
  });
});
```

- [ ] **Step 5: Write tests for start command**

Create `tests/unit/commands/start.test.ts` — same structure as done.test.ts but with `createStartCommand` and expecting `status:in-progress`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { createStartCommand } from '../../../src/commands/start.js';

const FIXTURES = join(import.meta.dirname, '../../fixtures');

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createStartCommand());
  return program;
}

describe('start command', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mtask-test-'));
    file = join(dir, 'TASKS.md');
    const fixture = readFileSync(join(FIXTURES, 'valid.md'), 'utf-8');
    await writeFile(file, fixture, 'utf-8');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it('marks task as in-progress', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'start', '1', '--file', file]);

    const content = await readFile(file, 'utf-8');
    expect(content).toMatch(/### Task 1[\s\S]*status:in-progress/);
  });

  it('outputs JSON when --format json', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'start', '1', '--file', file, '--format', 'json']);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.task.status).toBe('in-progress');
  });
});
```

- [ ] **Step 6: Run tests, lint, typecheck**

Run: `pnpm test`
Run: `pnpm typecheck`
Run: `pnpm lint`

- [ ] **Step 7: Commit**

```
feat: add done and start shortcut commands
```

---

### Task 5: Add `next` command

**Files:**

- Create: `src/commands/next.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/commands/next.test.ts`

- [ ] **Step 1: Create next command**

Create `src/commands/next.ts`:

```typescript
import { Command } from 'commander';
import { parseTaskFile } from '../core/parser.js';
import type { Task, Priority } from '../core/task.js';
import { PRIORITIES } from '../core/task.js';
import { readTasksFile, fileExists } from '../shared/file.js';
import { formatJson, formatTaskDetail } from '../shared/output.js';
import { fileNotFound } from '../shared/errors.js';

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function isBlocked(task: Task, tasks: Task[]): boolean {
  if (task.depends.length === 0) return false;
  return task.depends.some((depId) => {
    const dep = tasks.find((t) => t.id === depId);
    return !dep || dep.status !== 'done';
  });
}

export function createNextCommand(): Command {
  return new Command('next')
    .description('Show highest-priority actionable task')
    .option('--scope <value>', 'Filter by scope')
    .option('--type <value>', 'Filter by type')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .action(async (opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;

      if (!(await fileExists(filePath))) {
        throw fileNotFound(filePath);
      }

      const content = await readTasksFile(filePath);
      const taskFile = parseTaskFile(content);

      let candidates = taskFile.tasks.filter(
        (t) => t.status === 'todo' || t.status === 'in-progress',
      );

      // Filter out blocked tasks
      candidates = candidates.filter((t) => !isBlocked(t, taskFile.tasks));

      if (opts.scope) {
        candidates = candidates.filter((t) => t.scope === opts.scope);
      }
      if (opts.type) {
        candidates = candidates.filter((t) => t.type === opts.type.toLowerCase());
      }

      // Sort: in-progress first, then by priority
      candidates.sort((a, b) => {
        if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
        if (b.status === 'in-progress' && a.status !== 'in-progress') return 1;
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      });

      const next = candidates[0];

      if (!next) {
        if (format === 'json') {
          console.log(formatJson({ task: null }));
        } else {
          console.log('No actionable tasks.');
        }
        return;
      }

      if (format === 'json') {
        console.log(formatJson({ task: next }));
      } else {
        console.log(formatTaskDetail(next));
      }
    });
}
```

- [ ] **Step 2: Register in index.ts**

```typescript
import { createNextCommand } from './commands/next.js';

program.addCommand(createNextCommand());
```

- [ ] **Step 3: Write tests**

Create `tests/unit/commands/next.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { createNextCommand } from '../../../src/commands/next.js';

const FIXTURES = join(import.meta.dirname, '../../fixtures');

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createNextCommand());
  return program;
}

describe('next command', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mtask-test-'));
    file = join(dir, 'TASKS.md');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it('returns highest priority todo task', async () => {
    const fixture = readFileSync(join(FIXTURES, 'valid.md'), 'utf-8');
    await writeFile(file, fixture, 'utf-8');

    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'next', '--file', file]);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    // Task 2 is in-progress, should come first; else Task 1 (high) beats Task 2 (medium)
    // Actually: Task 2 is in-progress so it comes first
    expect(output).toContain('Add caching layer');
  });

  it('prefers in-progress over todo', async () => {
    const fixture = readFileSync(join(FIXTURES, 'valid.md'), 'utf-8');
    await writeFile(file, fixture, 'utf-8');

    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'next', '--file', file, '--format', 'json']);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.task.status).toBe('in-progress');
  });

  it('filters by scope', async () => {
    const fixture = readFileSync(join(FIXTURES, 'valid.md'), 'utf-8');
    await writeFile(file, fixture, 'utf-8');

    const program = buildProgram();
    await program.parseAsync([
      'node',
      'test',
      'next',
      '--file',
      file,
      '--scope',
      'backend',
      '--format',
      'json',
    ]);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.task.scope).toBe('backend');
  });

  it('skips blocked tasks', async () => {
    const content = [
      '# Tasks',
      '',
      '### Task 1',
      'Blocked task',
      'type:task, priority:critical, scope:general, status:todo, created:2026-01-01, updated:2026-01-01, depends:2',
      '',
      '### Task 2',
      'Dependency not done',
      'type:task, priority:low, scope:general, status:todo, created:2026-01-01, updated:2026-01-01',
      '',
    ].join('\n');
    await writeFile(file, content, 'utf-8');

    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'next', '--file', file, '--format', 'json']);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    // Task 1 is blocked (depends on Task 2 which is not done), so Task 2 is returned
    expect(parsed.task.id).toBe(2);
  });

  it('returns null when no actionable tasks', async () => {
    const content =
      '# Tasks\n\n### Task 1\nDone task\ntype:task, priority:high, scope:general, status:done, created:2026-01-01, updated:2026-01-01\n';
    await writeFile(file, content, 'utf-8');

    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'next', '--file', file, '--format', 'json']);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.task).toBeNull();
  });
});
```

- [ ] **Step 4: Run tests, lint, typecheck**

Run: `pnpm test`
Run: `pnpm typecheck`
Run: `pnpm lint`

- [ ] **Step 5: Commit**

```
feat: add next command with dependency awareness
```

---

### Task 6: Add `search` command

**Files:**

- Create: `src/commands/search.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/commands/search.test.ts`

- [ ] **Step 1: Create search command**

Create `src/commands/search.ts`:

```typescript
import { Command } from 'commander';
import { parseTaskFile } from '../core/parser.js';
import { readTasksFile, fileExists } from '../shared/file.js';
import { formatJson, formatTaskList } from '../shared/output.js';
import { fileNotFound } from '../shared/errors.js';

export function createSearchCommand(): Command {
  return new Command('search')
    .description('Search tasks by keyword in description and notes')
    .argument('<query>', 'Search query (case-insensitive)')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .action(async (query: string, opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;

      if (!(await fileExists(filePath))) {
        throw fileNotFound(filePath);
      }

      const content = await readTasksFile(filePath);
      const taskFile = parseTaskFile(content);

      const lowerQuery = query.toLowerCase();
      const matches = taskFile.tasks.filter((t) => {
        if (t.description.toLowerCase().includes(lowerQuery)) return true;
        return t.extraLines.some((line) => line.toLowerCase().includes(lowerQuery));
      });

      if (format === 'json') {
        console.log(formatJson({ tasks: matches, count: matches.length }));
      } else {
        console.log(formatTaskList(matches));
      }
    });
}
```

- [ ] **Step 2: Register in index.ts**

```typescript
import { createSearchCommand } from './commands/search.js';

program.addCommand(createSearchCommand());
```

- [ ] **Step 3: Write tests**

Create `tests/unit/commands/search.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { createSearchCommand } from '../../../src/commands/search.js';

const FIXTURES = join(import.meta.dirname, '../../fixtures');

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createSearchCommand());
  return program;
}

describe('search command', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mtask-test-'));
    file = join(dir, 'TASKS.md');
    const fixture = readFileSync(join(FIXTURES, 'valid.md'), 'utf-8');
    await writeFile(file, fixture, 'utf-8');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it('finds tasks by description keyword', async () => {
    const program = buildProgram();
    await program.parseAsync([
      'node',
      'test',
      'search',
      'login',
      '--file',
      file,
      '--format',
      'json',
    ]);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.count).toBe(1);
    expect(parsed.tasks[0].description).toContain('login');
  });

  it('search is case-insensitive', async () => {
    const program = buildProgram();
    await program.parseAsync([
      'node',
      'test',
      'search',
      'LOGIN',
      '--file',
      file,
      '--format',
      'json',
    ]);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.count).toBe(1);
  });

  it('returns empty when no match', async () => {
    const program = buildProgram();
    await program.parseAsync([
      'node',
      'test',
      'search',
      'nonexistent',
      '--file',
      file,
      '--format',
      'json',
    ]);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.count).toBe(0);
  });
});
```

- [ ] **Step 4: Run tests, lint, typecheck**

Run: `pnpm test`
Run: `pnpm typecheck`
Run: `pnpm lint`

- [ ] **Step 5: Commit**

```
feat: add search command
```

---

### Task 7: Add `stats` command

**Files:**

- Create: `src/commands/stats.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/commands/stats.test.ts`

- [ ] **Step 1: Create stats command**

Create `src/commands/stats.ts`:

```typescript
import { Command } from 'commander';
import { parseTaskFile } from '../core/parser.js';
import type { Status } from '../core/task.js';
import { STATUSES, PRIORITIES } from '../core/task.js';
import { readTasksFile, fileExists } from '../shared/file.js';
import { formatJson } from '../shared/output.js';
import { fileNotFound } from '../shared/errors.js';

export function createStatsCommand(): Command {
  return new Command('stats')
    .description('Show task count summary')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .action(async (opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;

      if (!(await fileExists(filePath))) {
        throw fileNotFound(filePath);
      }

      const content = await readTasksFile(filePath);
      const taskFile = parseTaskFile(content);
      const tasks = taskFile.tasks;

      const byStatus: Record<string, number> = {};
      for (const s of STATUSES) {
        byStatus[s] = tasks.filter((t) => t.status === s).length;
      }

      const byPriority: Record<string, number> = {};
      for (const p of PRIORITIES) {
        byPriority[p] = tasks.filter((t) => t.priority === p).length;
      }

      const blocked = tasks.filter(
        (t) =>
          t.depends.length > 0 &&
          t.depends.some((depId) => {
            const dep = tasks.find((d) => d.id === depId);
            return !dep || dep.status !== 'done';
          }),
      ).length;

      const stats = { total: tasks.length, byStatus, byPriority, blocked };

      if (format === 'json') {
        console.log(formatJson(stats));
      } else {
        const parts: string[] = [`Total: ${stats.total}`];
        for (const [status, count] of Object.entries(byStatus)) {
          if (count > 0) parts.push(`  ${status}: ${count}`);
        }
        if (blocked > 0) parts.push(`Blocked: ${blocked}`);
        console.log(parts.join('\n'));
      }
    });
}
```

- [ ] **Step 2: Register in index.ts**

```typescript
import { createStatsCommand } from './commands/stats.js';

program.addCommand(createStatsCommand());
```

- [ ] **Step 3: Write tests**

Create `tests/unit/commands/stats.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { createStatsCommand } from '../../../src/commands/stats.js';

const FIXTURES = join(import.meta.dirname, '../../fixtures');

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createStatsCommand());
  return program;
}

describe('stats command', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mtask-test-'));
    file = join(dir, 'TASKS.md');
    const fixture = readFileSync(join(FIXTURES, 'valid.md'), 'utf-8');
    await writeFile(file, fixture, 'utf-8');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it('outputs correct counts as JSON', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'stats', '--file', file, '--format', 'json']);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.total).toBe(3);
    expect(parsed.byStatus.todo).toBe(1);
    expect(parsed.byStatus['in-progress']).toBe(1);
    expect(parsed.byStatus.done).toBe(1);
  });

  it('outputs text summary', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'stats', '--file', file]);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(output).toContain('Total: 3');
    expect(output).toContain('todo: 1');
  });
});
```

- [ ] **Step 4: Run tests, lint, typecheck**

Run: `pnpm test`
Run: `pnpm typecheck`
Run: `pnpm lint`

- [ ] **Step 5: Commit**

```
feat: add stats command
```

---

### Task 8: Add `--sort` to list command

**Files:**

- Modify: `src/commands/list.ts`
- Test: `tests/unit/commands/list.test.ts`

- [ ] **Step 1: Add sort logic to list command**

In `src/commands/list.ts`, add option:

```typescript
.option('--sort <field>', 'Sort by: priority/created/updated/status/id', '')
```

Add after filtering, before output, the sort logic. Import `PRIORITIES` from task.ts:

```typescript
import { PRIORITIES } from '../core/task.js';

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const STATUS_ORDER: Record<string, number> = {
  'in-progress': 0,
  todo: 1,
  done: 2,
  cancelled: 3,
};
```

Then after filtering:

```typescript
if (opts.sort) {
  const field = opts.sort as string;
  tasks.sort((a, b) => {
    switch (field) {
      case 'priority':
        return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
      case 'status':
        return (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
      case 'created':
        return a.created.localeCompare(b.created);
      case 'updated':
        return a.updated.localeCompare(b.updated);
      case 'id':
        return a.id - b.id;
      default:
        return 0;
    }
  });
}
```

- [ ] **Step 2: Write tests**

In `tests/unit/commands/list.test.ts`, add:

```typescript
it('sorts by priority', async () => {
  const program = buildProgram();
  await program.parseAsync([
    'node',
    'test',
    'list',
    '--file',
    file,
    '--sort',
    'priority',
    '--format',
    'json',
  ]);

  const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
  const parsed = JSON.parse(output);
  const priorities = parsed.tasks.map((t: { priority: string }) => t.priority);
  expect(priorities[0]).toBe('high');
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm test`

- [ ] **Step 4: Commit**

```
feat: add --sort option to list command
```

---

### Task 9: Add multi-value filter support to list

**Files:**

- Modify: `src/commands/list.ts`
- Test: `tests/unit/commands/list.test.ts`

- [ ] **Step 1: Update filter logic**

In `src/commands/list.ts`, replace each filter with comma-split logic:

```typescript
if (opts.priority) {
  const values = (opts.priority as string).toLowerCase().split(',');
  tasks = tasks.filter((t) => values.includes(t.priority));
}
if (opts.scope) {
  const values = (opts.scope as string).split(',');
  tasks = tasks.filter((t) => values.includes(t.scope));
}
if (opts.type) {
  const values = (opts.type as string).toLowerCase().split(',');
  tasks = tasks.filter((t) => values.includes(t.type));
}
if (opts.status) {
  const values = (opts.status as string).toLowerCase().split(',');
  tasks = tasks.filter((t) => values.includes(t.status));
}
```

- [ ] **Step 2: Write test**

In `tests/unit/commands/list.test.ts`, add:

```typescript
it('filters by multiple statuses', async () => {
  const program = buildProgram();
  await program.parseAsync([
    'node',
    'test',
    'list',
    '--file',
    file,
    '--status',
    'todo,done',
    '--format',
    'json',
  ]);

  const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
  const parsed = JSON.parse(output);
  expect(parsed.count).toBe(2);
  const statuses = parsed.tasks.map((t: { status: string }) => t.status);
  expect(statuses).toContain('todo');
  expect(statuses).toContain('done');
});

it('filters by multiple scopes', async () => {
  const program = buildProgram();
  await program.parseAsync([
    'node',
    'test',
    'list',
    '--file',
    file,
    '--scope',
    'backend,general',
    '--format',
    'json',
  ]);

  const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
  const parsed = JSON.parse(output);
  expect(parsed.count).toBe(3);
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm test`

- [ ] **Step 4: Commit**

```
feat: support multi-value filters in list command
```

---

### Task 10: Add `--quiet` flag to all commands

**Files:**

- Create: `src/shared/quiet.ts`
- Modify: `src/commands/add.ts`
- Modify: `src/commands/update.ts`
- Modify: `src/commands/remove.ts`
- Modify: `src/commands/view.ts`
- Modify: `src/commands/list.ts`
- Modify: `src/commands/init.ts`
- Modify: `src/commands/done.ts` (via status-shortcut.ts)
- Modify: `src/commands/start.ts` (via status-shortcut.ts)
- Modify: `src/commands/next.ts`
- Modify: `src/commands/search.ts`
- Modify: `src/commands/stats.ts`
- Modify: `src/commands/status-shortcut.ts`
- Test: `tests/unit/commands/add.test.ts`

**Design:** `--quiet` outputs minimal machine-parseable output:

- Write commands (add, update, remove, done, start, init): print just the affected task ID
- Read commands (view, next): print just the task ID
- List/search: print one ID per line
- Stats: print `total:N` single line

- [ ] **Step 1: Add --quiet to add command**

In `src/commands/add.ts`, add option:

```typescript
.option('-q, --quiet', 'Minimal output (just task ID)')
```

Replace output section:

```typescript
if (opts.quiet) {
  console.log(String(task.id));
} else if (format === 'json') {
  console.log(formatJson({ task }));
} else {
  console.log(`Created task ${task.id}: ${task.description}`);
}
```

- [ ] **Step 2: Add --quiet to all other commands following same pattern**

For each command, add `.option('-q, --quiet', 'Minimal output')` and add the quiet branch before the format check.

**update.ts**: quiet outputs `String(task.id)`
**remove.ts**: quiet outputs `String(removed.id)`
**view.ts**: quiet outputs `String(task.id)`
**init.ts**: quiet outputs `filePath`
**list.ts**: quiet outputs `tasks.map((t) => String(t.id)).join('\n')` or empty string if no tasks
**status-shortcut.ts**: quiet outputs `String(task.id)`
**next.ts**: quiet outputs `next ? String(next.id) : ''`
**search.ts**: quiet outputs `matches.map((t) => String(t.id)).join('\n')`
**stats.ts**: quiet outputs `String(stats.total)`

- [ ] **Step 3: Write test for quiet mode**

In `tests/unit/commands/add.test.ts`, add:

```typescript
it('outputs only task ID in quiet mode', async () => {
  const program = buildProgram();
  await program.parseAsync(['node', 'test', 'add', '--file', file, '--quiet', 'Quiet task']);

  const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
  expect(output).toBe('1');
});
```

- [ ] **Step 4: Run tests, lint, typecheck**

Run: `pnpm test`
Run: `pnpm typecheck`
Run: `pnpm lint`

- [ ] **Step 5: Commit**

```
feat: add --quiet flag for minimal machine output
```

---

### Task 11: Add `batch` command

**Files:**

- Create: `src/commands/batch.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/commands/batch.test.ts`

- [ ] **Step 1: Create batch command**

Create `src/commands/batch.ts`:

```typescript
import { Command } from 'commander';
import { parseTaskFile, serializeTaskFile } from '../core/parser.js';
import {
  applyDefaults,
  isValidPriority,
  isValidType,
  isValidStatus,
  type TaskInput,
  type Priority,
  type TaskType,
  type Status,
} from '../core/task.js';
import { nextId } from '../core/id.js';
import { readTasksFile, writeTasksFile, fileExists } from '../shared/file.js';
import { formatJson } from '../shared/output.js';
import { fileNotFound } from '../shared/errors.js';

interface BatchAction {
  action: 'add' | 'update' | 'remove' | 'done' | 'start';
  id?: number;
  description?: string;
  priority?: string;
  scope?: string;
  type?: string;
  status?: string;
  note?: string;
  dependsOn?: string;
}

interface BatchResult {
  index: number;
  action: string;
  ok: boolean;
  id?: number;
  error?: string;
}

const EMPTY_FILE = '# Tasks\n';

export function createBatchCommand(): Command {
  return new Command('batch')
    .description('Execute multiple task operations from JSON stdin')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .action(async (opts) => {
      const filePath: string = opts.file;

      // Read JSON from stdin
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk as Buffer);
      }
      const input = Buffer.concat(chunks).toString('utf-8').trim();
      const actions: BatchAction[] = JSON.parse(input);

      let content = EMPTY_FILE;
      if (await fileExists(filePath)) {
        content = await readTasksFile(filePath);
      }

      const taskFile = parseTaskFile(content);
      const results: BatchResult[] = [];

      for (let i = 0; i < actions.length; i++) {
        const act = actions[i]!;
        try {
          switch (act.action) {
            case 'add': {
              if (!act.description) throw new Error('description required');
              const input: TaskInput = {
                description: act.description,
                priority: act.priority,
                scope: act.scope,
                type: act.type,
                status: act.status,
                depends: act.dependsOn,
              };
              const id = nextId(taskFile.tasks);
              const task = applyDefaults(input, id);
              taskFile.tasks.push(task);
              results.push({ index: i, action: 'add', ok: true, id });
              break;
            }
            case 'update': {
              if (!act.id) throw new Error('id required');
              const task = taskFile.tasks.find((t) => t.id === act.id);
              if (!task) throw new Error(`Task ${act.id} not found`);
              if (act.description) task.description = act.description;
              if (act.priority && isValidPriority(act.priority)) {
                task.priority = act.priority.toLowerCase() as Priority;
              }
              if (act.scope) task.scope = act.scope;
              if (act.type && isValidType(act.type)) {
                task.type = act.type.toLowerCase() as TaskType;
              }
              if (act.status && isValidStatus(act.status)) {
                task.status = act.status.toLowerCase() as Status;
              }
              if (act.note) task.extraLines.push(`> ${act.note}`);
              task.updated = new Date().toISOString().slice(0, 10);
              results.push({ index: i, action: 'update', ok: true, id: act.id });
              break;
            }
            case 'remove': {
              if (!act.id) throw new Error('id required');
              const idx = taskFile.tasks.findIndex((t) => t.id === act.id);
              if (idx === -1) throw new Error(`Task ${act.id} not found`);
              taskFile.tasks.splice(idx, 1);
              results.push({ index: i, action: 'remove', ok: true, id: act.id });
              break;
            }
            case 'done': {
              if (!act.id) throw new Error('id required');
              const task = taskFile.tasks.find((t) => t.id === act.id);
              if (!task) throw new Error(`Task ${act.id} not found`);
              task.status = 'done';
              task.updated = new Date().toISOString().slice(0, 10);
              results.push({ index: i, action: 'done', ok: true, id: act.id });
              break;
            }
            case 'start': {
              if (!act.id) throw new Error('id required');
              const task = taskFile.tasks.find((t) => t.id === act.id);
              if (!task) throw new Error(`Task ${act.id} not found`);
              task.status = 'in-progress';
              task.updated = new Date().toISOString().slice(0, 10);
              results.push({ index: i, action: 'start', ok: true, id: act.id });
              break;
            }
            default:
              results.push({
                index: i,
                action: String(act.action),
                ok: false,
                error: `Unknown action: ${act.action}`,
              });
          }
        } catch (err) {
          results.push({
            index: i,
            action: act.action,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      await writeTasksFile(filePath, serializeTaskFile(taskFile));
      console.log(formatJson({ results }));
    });
}
```

- [ ] **Step 2: Register in index.ts**

```typescript
import { createBatchCommand } from './commands/batch.js';

program.addCommand(createBatchCommand());
```

- [ ] **Step 3: Write tests**

Create `tests/unit/commands/batch.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { Command } from 'commander';
import { createBatchCommand } from '../../../src/commands/batch.js';

const FIXTURES = join(import.meta.dirname, '../../fixtures');

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createBatchCommand());
  return program;
}

function mockStdin(data: string) {
  const readable = new Readable();
  readable.push(data);
  readable.push(null);
  Object.defineProperty(process, 'stdin', { value: readable, writable: true });
}

describe('batch command', () => {
  let dir: string;
  let file: string;
  let originalStdin: typeof process.stdin;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mtask-test-'));
    file = join(dir, 'TASKS.md');
    originalStdin = process.stdin;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true });
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it('adds multiple tasks in one call', async () => {
    const actions = [
      { action: 'add', description: 'Task A', priority: 'high' },
      { action: 'add', description: 'Task B', priority: 'low' },
    ];
    mockStdin(JSON.stringify(actions));

    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'batch', '--file', file]);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.results).toHaveLength(2);
    expect(parsed.results[0].ok).toBe(true);
    expect(parsed.results[1].ok).toBe(true);

    const content = await readFile(file, 'utf-8');
    expect(content).toContain('Task A');
    expect(content).toContain('Task B');
  });

  it('handles mixed operations', async () => {
    const fixture = readFileSync(join(FIXTURES, 'valid.md'), 'utf-8');
    await writeFile(file, fixture, 'utf-8');

    const actions = [
      { action: 'done', id: 1 },
      { action: 'add', description: 'New task' },
      { action: 'remove', id: 3 },
    ];
    mockStdin(JSON.stringify(actions));

    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'batch', '--file', file]);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.results.every((r: { ok: boolean }) => r.ok)).toBe(true);

    const content = await readFile(file, 'utf-8');
    expect(content).toContain('status:done');
    expect(content).toContain('New task');
    expect(content).not.toContain('Refactor auth module');
  });

  it('reports errors per action without aborting', async () => {
    const fixture = readFileSync(join(FIXTURES, 'valid.md'), 'utf-8');
    await writeFile(file, fixture, 'utf-8');

    const actions = [
      { action: 'done', id: 999 },
      { action: 'done', id: 1 },
    ];
    mockStdin(JSON.stringify(actions));

    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'batch', '--file', file]);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.results[0].ok).toBe(false);
    expect(parsed.results[0].error).toContain('not found');
    expect(parsed.results[1].ok).toBe(true);
  });
});
```

- [ ] **Step 4: Run tests, lint, typecheck**

Run: `pnpm test`
Run: `pnpm typecheck`
Run: `pnpm lint`

- [ ] **Step 5: Commit**

```
feat: add batch command for bulk operations via JSON stdin
```

---

### Task 12: Add specific exit codes

**Files:**

- Modify: `src/shared/errors.ts`
- Modify: `src/index.ts`
- Modify: `src/commands/next.ts`

- [ ] **Step 1: Add exit code constants**

In `src/shared/errors.ts`, update:

```typescript
export const EXIT_SUCCESS = 0;
export const EXIT_ERROR = 1;
export const EXIT_NOT_FOUND = 2;
```

Update `taskNotFound` and `fileNotFound` to use `EXIT_NOT_FOUND`:

```typescript
export function taskNotFound(id: number): MtaskError {
  return new MtaskError(`Task ${id} not found`, EXIT_NOT_FOUND);
}

export function fileNotFound(path: string): MtaskError {
  return new MtaskError(`No tasks file found at ${path}. Run: mtask init`, EXIT_NOT_FOUND);
}
```

- [ ] **Step 2: Set exit code in next command for no results**

In `src/commands/next.ts`, when no actionable task exists, set exit code:

```typescript
if (!next) {
  if (format === 'json') {
    console.log(formatJson({ task: null }));
  } else {
    console.log('No actionable tasks.');
  }
  process.exitCode = EXIT_NOT_FOUND;
  return;
}
```

Import `EXIT_NOT_FOUND` from errors.

- [ ] **Step 3: Run tests, verify exit codes don't break anything**

Run: `pnpm test`

- [ ] **Step 4: Commit**

```
feat: add specific exit codes (0=success, 1=error, 2=not-found)
```

---

### Task 13: Update CLAUDE.md and fixture files

**Files:**

- Modify: `CLAUDE.md`
- Modify: `tests/fixtures/valid.md` (if not already updated)

- [ ] **Step 1: Update CLAUDE.md with new commands**

Add new commands to the architecture section and document the new features.

- [ ] **Step 2: Run full test suite one final time**

Run: `pnpm test`
Run: `pnpm typecheck`
Run: `pnpm lint`
Run: `pnpm format:check`

- [ ] **Step 3: Commit**

```
docs: update CLAUDE.md with new AI-boost features
```
