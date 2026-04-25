import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Command } from 'commander';
import { createFormatCommand } from '../../../src/commands/format.js';

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createFormatCommand());
  return program;
}

describe('format command', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'md-task-test-'));
    file = join(dir, 'TASKS.md');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it('reorders task tags to match frontmatter field order', async () => {
    const original = [
      '---',
      'id:',
      '  prefix: T',
      '  separator: "-"',
      'fields:',
      '  priority: [critical, high, medium, low]',
      '  type: [feature, bug, task, chore]',
      '  status: [todo, in-progress, done, cancelled]',
      '  terminal: [done, cancelled]',
      'defaults:',
      '  priority: medium',
      '  type: task',
      '  status: todo',
      '  scope: general',
      '---',
      '',
      '# Tasks',
      '',
      '### T-1',
      'status:todo, type:task, priority:medium, scope:general, created:2026-01-01, updated:2026-01-01',
      'A task',
      '',
    ].join('\n');
    await writeFile(file, original, 'utf-8');

    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'format', '--file', file]);

    const after = await readFile(file, 'utf-8');
    expect(after).toContain(
      'priority:medium, type:task, status:todo, scope:general, created:2026-01-01, updated:2026-01-01',
    );
  });

  it('is idempotent — second run reports unchanged', async () => {
    const initial = [
      '---',
      'id:',
      '  prefix: T',
      '  separator: "-"',
      'fields:',
      '  status: [todo, in-progress, done, cancelled]',
      '  type: [feature, bug, task, chore]',
      '  priority: [critical, high, medium, low]',
      '  terminal: [done, cancelled]',
      'defaults:',
      '  priority: medium',
      '  type: task',
      '  status: todo',
      '  scope: general',
      '---',
      '',
      '# Tasks',
      '',
      '### T-1',
      'priority:medium, type:task, status:todo, scope:general, created:2026-01-01, updated:2026-01-01',
      'A task',
      '',
    ].join('\n');
    await writeFile(file, initial, 'utf-8');

    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'format', '--file', file]);
    const first = await readFile(file, 'utf-8');

    await program.parseAsync(['node', 'test', 'format', '--file', file]);
    const second = await readFile(file, 'utf-8');

    expect(second).toBe(first);
  });

  it('--check exits non-zero when file is not formatted', async () => {
    const original = [
      '---',
      'id:',
      '  prefix: T',
      '  separator: "-"',
      'fields:',
      '  priority: [critical, high, medium, low]',
      '  type: [feature, bug, task, chore]',
      '  status: [todo, in-progress, done, cancelled]',
      '  terminal: [done, cancelled]',
      'defaults:',
      '  priority: medium',
      '  type: task',
      '  status: todo',
      '  scope: general',
      '---',
      '',
      '# Tasks',
      '',
      '### T-1',
      'status:todo, type:task, priority:medium, scope:general, created:2026-01-01, updated:2026-01-01',
      'A task',
      '',
    ].join('\n');
    await writeFile(file, original, 'utf-8');

    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'format', '--file', file, '--check', '--quiet']);
    expect(process.exitCode).toBe(1);

    const after = await readFile(file, 'utf-8');
    expect(after).toBe(original);

    process.exitCode = 0;
  });

  it('errors when file does not exist', async () => {
    const program = buildProgram();
    await expect(
      program.parseAsync(['node', 'test', 'format', '--file', file]),
    ).rejects.toThrow();
  });
});
