import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Command } from 'commander';
import { createInitCommand } from '../../../src/commands/init.js';

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createInitCommand());
  return program;
}

describe('init command', () => {
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

  it('creates new tasks file', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'init', '--file', file]);

    const content = await readFile(file, 'utf-8');
    expect(content).toBe('# Tasks\n');
  });

  it('outputs JSON when --format json', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'init', '--file', file, '--format', 'json']);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.created).toBe(file);
  });

  it('errors when file already exists', async () => {
    await writeFile(file, '# Tasks\n', 'utf-8');
    const program = buildProgram();
    await expect(
      program.parseAsync(['node', 'test', 'init', '--file', file]),
    ).rejects.toThrow('already exists');
  });
});
