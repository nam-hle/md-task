import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { createMoveCommand } from '../../../src/commands/move.js';

const FIXTURES = join(import.meta.dirname, '../../fixtures');

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createMoveCommand());
  return program;
}

describe('move command', () => {
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

  describe('without transitions', () => {
    beforeEach(async () => {
      const fixture = readFileSync(join(FIXTURES, 'valid.md'), 'utf-8');
      await writeFile(file, fixture, 'utf-8');
    });

    it('moves task to new status', async () => {
      const program = buildProgram();
      await program.parseAsync(['node', 'test', 'move', 'Task 1', 'done', '--file', file]);
      const content = await readFile(file, 'utf-8');
      expect(content).toContain('status:done');
    });

    it('rejects invalid status', async () => {
      const program = buildProgram();
      await expect(
        program.parseAsync(['node', 'test', 'move', 'Task 1', 'invalid', '--file', file]),
      ).rejects.toThrow('Invalid status');
    });

    it('errors on non-existent task', async () => {
      const program = buildProgram();
      await expect(
        program.parseAsync(['node', 'test', 'move', 'Task 999', 'done', '--file', file]),
      ).rejects.toThrow('Task 999 not found');
    });

    it('outputs JSON with --format json', async () => {
      const program = buildProgram();
      await program.parseAsync([
        'node', 'test', 'move', 'Task 1', 'done', '--file', file, '--format', 'json',
      ]);
      const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      const parsed = JSON.parse(output);
      expect(parsed.task.status).toBe('done');
    });

    it('outputs just ID with --quiet', async () => {
      const program = buildProgram();
      await program.parseAsync([
        'node', 'test', 'move', 'Task 1', 'done', '--file', file, '--quiet',
      ]);
      expect(console.log).toHaveBeenCalledWith('1');
    });
  });

  describe('with transitions', () => {
    beforeEach(async () => {
      const fixture = readFileSync(join(FIXTURES, 'transitions.md'), 'utf-8');
      await writeFile(file, fixture, 'utf-8');
    });

    it('allows valid transition', async () => {
      const program = buildProgram();
      await program.parseAsync([
        'node', 'test', 'move', 'Task 1', 'in-progress', '--file', file,
      ]);
      const content = await readFile(file, 'utf-8');
      expect(content).toContain('status:in-progress');
    });

    it('rejects invalid transition', async () => {
      const program = buildProgram();
      await expect(
        program.parseAsync(['node', 'test', 'move', 'Task 1', 'done', '--file', file]),
      ).rejects.toThrow('Cannot transition from "todo" to "done"');
    });

    it('allows invalid transition with --force', async () => {
      const program = buildProgram();
      await program.parseAsync([
        'node', 'test', 'move', 'Task 1', 'done', '--file', file, '--force',
      ]);
      const content = await readFile(file, 'utf-8');
      expect(content).toContain('status:done');
    });

    it('rejects transition from terminal state', async () => {
      const program = buildProgram();
      await expect(
        program.parseAsync(['node', 'test', 'move', 'Task 3', 'todo', '--file', file]),
      ).rejects.toThrow('Cannot transition from "done" to "todo"');
    });
  });
});
