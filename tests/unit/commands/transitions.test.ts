import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { createUpdateCommand } from '../../../src/commands/update.js';
import { createMoveCommand } from '../../../src/commands/move.js';

const FIXTURES = join(import.meta.dirname, '../../fixtures');

function buildUpdateProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createUpdateCommand());
  return program;
}

function buildMoveProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createMoveCommand());
  return program;
}

describe('status transitions in commands', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'md-task-test-'));
    file = join(dir, 'TASKS.md');
    const fixture = readFileSync(join(FIXTURES, 'transitions.md'), 'utf-8');
    await writeFile(file, fixture, 'utf-8');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  describe('update command', () => {
    it('allows valid transition: todo → in-progress', async () => {
      const program = buildUpdateProgram();
      await program.parseAsync([
        'node', 'test', 'update', '1', '--file', file, '--status', 'in-progress',
      ]);
      const content = await readFile(file, 'utf-8');
      expect(content).toContain('status:in-progress');
    });

    it('rejects invalid transition: todo → done', async () => {
      const program = buildUpdateProgram();
      await expect(
        program.parseAsync([
          'node', 'test', 'update', '1', '--file', file, '--status', 'done',
        ]),
      ).rejects.toThrow('Cannot transition from "todo" to "done"');
    });

    it('rejects transition from terminal: done → todo', async () => {
      const program = buildUpdateProgram();
      await expect(
        program.parseAsync([
          'node', 'test', 'update', '3', '--file', file, '--status', 'todo',
        ]),
      ).rejects.toThrow('Cannot transition from "done" to "todo"');
    });

    it('allows invalid transition with --force', async () => {
      const program = buildUpdateProgram();
      await program.parseAsync([
        'node', 'test', 'update', '1', '--file', file, '--status', 'done', '--force',
      ]);
      const content = await readFile(file, 'utf-8');
      expect(content).toContain('status:done');
    });
  });

  describe('move command', () => {
    it('rejects move to done from todo (must go through in-progress/review)', async () => {
      const program = buildMoveProgram();
      await expect(
        program.parseAsync(['node', 'test', 'move', '1', 'done', '--file', file]),
      ).rejects.toThrow('Cannot transition from "todo" to "done"');
    });

    it('allows move to done with --force', async () => {
      const program = buildMoveProgram();
      await program.parseAsync([
        'node', 'test', 'move', '1', 'done', '--file', file, '--force',
      ]);
      const content = await readFile(file, 'utf-8');
      expect(content).toContain('status:done');
    });

    it('allows move to in-progress from todo', async () => {
      const program = buildMoveProgram();
      await program.parseAsync([
        'node', 'test', 'move', '1', 'in-progress', '--file', file,
      ]);
      const content = await readFile(file, 'utf-8');
      expect(content).toContain('status:in-progress');
    });

    it('rejects move from terminal state', async () => {
      const program = buildMoveProgram();
      await expect(
        program.parseAsync(['node', 'test', 'move', '3', 'todo', '--file', file]),
      ).rejects.toThrow('Cannot transition from "done" to "todo"');
    });
  });
});

describe('no transitions defined (backward compat)', () => {
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

  it('allows any transition when no transitions configured', async () => {
    const program = buildMoveProgram();
    await program.parseAsync(['node', 'test', 'move', '1', 'done', '--file', file]);
    const content = await readFile(file, 'utf-8');
    expect(content).toContain('status:done');
  });
});
