import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { createRemoveCommand } from '../../../src/commands/remove.js';

const FIXTURES = join(import.meta.dirname, '../../fixtures');

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createRemoveCommand());
  return program;
}

describe('remove command', () => {
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

  it('removes existing task', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'remove', 'Task 2', '--file', file]);

    const content = await readFile(file, 'utf-8');
    expect(content).not.toContain('### Task 2');
    expect(content).toContain('### Task 1');
    expect(content).toContain('### Task 3');
  });

  it('outputs JSON when --format json', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'remove', 'Task 1', '--file', file, '--format', 'json']);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.removed.id).toBe('Task 1');
  });

  it('errors on non-existent task', async () => {
    const program = buildProgram();
    await expect(
      program.parseAsync(['node', 'test', 'remove', 'Task 999', '--file', file]),
    ).rejects.toThrow('Task 999 not found');
  });
});
