import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { createViewCommand } from '../../../src/commands/view.js';

const FIXTURES = join(import.meta.dirname, '../../fixtures');

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createViewCommand());
  return program;
}

describe('view command', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'md-task-test-'));
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

  it('shows task details', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'view', 'Task 1', '--file', file]);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(output).toContain('Task 1');
    expect(output).toContain('Fix login timeout');
    expect(output).toContain('high');
    expect(output).toContain('backend');
  });

  it('outputs JSON when --format json', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'view', 'Task 1', '--file', file, '--format', 'json']);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.task.id).toBe(1);
    expect(parsed.task.description).toBe('Fix login timeout');
  });

  it('errors on non-existent task', async () => {
    const program = buildProgram();
    await expect(
      program.parseAsync(['node', 'test', 'view', 'Task 999', '--file', file]),
    ).rejects.toThrow('Task 999 not found');
  });
});
