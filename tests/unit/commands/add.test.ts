import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Command } from 'commander';
import { createAddCommand } from '../../../src/commands/add.js';

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createAddCommand());
  return program;
}

describe('add command', () => {
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

  it('creates file and adds task when file does not exist', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'add', '--file', file, 'My task']);

    const content = await readFile(file, 'utf-8');
    expect(content).toContain('### Task 1');
    expect(content).toContain('My task');
    expect(content).toContain('type:task');
    expect(content).toContain('priority:medium');
  });

  it('appends task to existing file', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'add', '--file', file, 'First task']);
    await program.parseAsync(['node', 'test', 'add', '--file', file, 'Second task']);

    const content = await readFile(file, 'utf-8');
    expect(content).toContain('### Task 1');
    expect(content).toContain('### Task 2');
    expect(content).toContain('Second task');
  });

  it('applies custom attributes', async () => {
    const program = buildProgram();
    await program.parseAsync([
      'node',
      'test',
      'add',
      '--file',
      file,
      '--priority',
      'high',
      '--scope',
      'backend',
      '--type',
      'bug',
      'Fix login',
    ]);

    const content = await readFile(file, 'utf-8');
    expect(content).toContain('priority:high');
    expect(content).toContain('scope:backend');
    expect(content).toContain('type:bug');
  });

  it('outputs JSON when --format json', async () => {
    const program = buildProgram();
    await program.parseAsync([
      'node',
      'test',
      'add',
      '--file',
      file,
      '--format',
      'json',
      'JSON task',
    ]);

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.task.id).toBe(1);
    expect(parsed.task.description).toBe('JSON task');
  });
});
