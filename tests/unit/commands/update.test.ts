import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { createUpdateCommand } from '../../../src/commands/update.js';

const FIXTURES = join(import.meta.dirname, '../../fixtures');

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createUpdateCommand());
  return program;
}

describe('update command', () => {
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

  it('updates task status', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'update', '1', '--file', file, '--status', 'done']);

    const content = await readFile(file, 'utf-8');
    expect(content).toContain('status:done');
    // Task 1 was previously status:todo
  });

  it('updates multiple attributes', async () => {
    const program = buildProgram();
    await program.parseAsync([
      'node',
      'test',
      'update',
      '1',
      '--file',
      file,
      '--priority',
      'critical',
      '--description',
      'Updated desc',
    ]);

    const content = await readFile(file, 'utf-8');
    expect(content).toContain('priority:critical');
    expect(content).toContain('Updated desc');
  });

  it('outputs JSON when --format json', async () => {
    const program = buildProgram();
    await program.parseAsync([
      'node',
      'test',
      'update',
      '1',
      '--file',
      file,
      '--format',
      'json',
      '--status',
      'done',
    ]);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.task.status).toBe('done');
  });

  it('errors on non-existent task', async () => {
    const program = buildProgram();
    await expect(
      program.parseAsync(['node', 'test', 'update', '999', '--file', file, '--status', 'done']),
    ).rejects.toThrow('Task 999 not found');
  });

  it('appends note to task', async () => {
    const program = buildProgram();
    await program.parseAsync([
      'node',
      'test',
      'update',
      '1',
      '--file',
      file,
      '--note',
      'tried X, failed',
    ]);

    const content = await readFile(file, 'utf-8');
    expect(content).toContain('> tried X, failed');
  });

  it('appends multiple notes', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'update', '1', '--file', file, '--note', 'note 1']);
    await program.parseAsync(['node', 'test', 'update', '1', '--file', file, '--note', 'note 2']);

    const content = await readFile(file, 'utf-8');
    expect(content).toContain('> note 1');
    expect(content).toContain('> note 2');
  });

  it('errors when no update options given', async () => {
    const program = buildProgram();
    await expect(
      program.parseAsync(['node', 'test', 'update', '1', '--file', file]),
    ).rejects.toThrow('No update options provided');
  });
});
