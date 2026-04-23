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
    dir = await mkdtemp(join(tmpdir(), 'md-task-test-'));
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
