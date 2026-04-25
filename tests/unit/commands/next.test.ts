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
    dir = await mkdtemp(join(tmpdir(), 'md-task-test-'));
    file = join(dir, 'TASKS.md');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it('returns task by status order then priority', async () => {
    const fixture = readFileSync(join(FIXTURES, 'valid.md'), 'utf-8');
    await writeFile(file, fixture, 'utf-8');

    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'next', '--file', file, '--format', 'json']);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    // Fixture status order: [todo, in-progress, done, cancelled]
    // Task 1 is todo (high), Task 2 is in-progress (medium) → todo comes first
    expect(parsed.task.status).toBe('todo');
    expect(parsed.task.description).toBe('Fix login timeout');
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
      '### T-1',
      'Blocked task',
      'type:task, priority:critical, scope:general, status:todo, created:2026-01-01, updated:2026-01-01, depends:2',
      '',
      '### T-2',
      'Dependency not done',
      'type:task, priority:low, scope:general, status:todo, created:2026-01-01, updated:2026-01-01',
      '',
    ].join('\n');
    await writeFile(file, content, 'utf-8');

    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'next', '--file', file, '--format', 'json']);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.task.id).toBe('T-2');
  });

  it('returns null when no actionable tasks', async () => {
    const content =
      '# Tasks\n\n### T-1\nDone task\ntype:task, priority:high, scope:general, status:done, created:2026-01-01, updated:2026-01-01\n';
    await writeFile(file, content, 'utf-8');

    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'next', '--file', file, '--format', 'json']);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.task).toBeNull();
  });
});
