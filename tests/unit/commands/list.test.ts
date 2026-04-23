import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { createListCommand } from '../../../src/commands/list.js';

const FIXTURES = join(import.meta.dirname, '../../fixtures');

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createListCommand());
  return program;
}

describe('list command', () => {
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

  it('lists all tasks', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'list', '--file', file]);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(output).toContain('Fix login timeout');
    expect(output).toContain('Add caching layer');
    expect(output).toContain('Refactor auth module');
  });

  it('filters by priority', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'list', '--file', file, '--priority', 'high']);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(output).toContain('Fix login timeout');
    expect(output).not.toContain('Add caching layer');
  });

  it('filters by status', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'list', '--file', file, '--status', 'done']);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(output).toContain('Refactor auth module');
    expect(output).not.toContain('Fix login timeout');
  });

  it('outputs JSON when --format json', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'list', '--file', file, '--format', 'json']);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.tasks).toHaveLength(3);
    expect(parsed.count).toBe(3);
  });

  it('shows empty message when no tasks match filter', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'list', '--file', file, '--priority', 'critical']);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(output).toContain('No tasks found');
  });

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
});
