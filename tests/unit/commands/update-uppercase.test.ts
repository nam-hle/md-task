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

describe('update command with uppercase schema', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'md-task-test-'));
    file = join(dir, 'TASKS.md');
    const fixture = readFileSync(join(FIXTURES, 'uppercase-schema.md'), 'utf-8');
    await writeFile(file, fixture, 'utf-8');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it('accepts uppercase priority from schema', async () => {
    const program = buildProgram();
    await program.parseAsync([
      'node', 'test', 'update', '1', '--file', file, '--priority', 'P0',
    ]);

    const content = await readFile(file, 'utf-8');
    expect(content).toContain('priority:P0');
  });

  it('accepts lowercase input and stores schema casing', async () => {
    const program = buildProgram();
    await program.parseAsync([
      'node', 'test', 'update', '1', '--file', file, '--priority', 'p0',
    ]);

    const content = await readFile(file, 'utf-8');
    expect(content).toContain('priority:P0');
  });

  it('accepts mixed-case status input', async () => {
    const program = buildProgram();
    await program.parseAsync([
      'node', 'test', 'update', '1', '--file', file, '--status', 'done',
    ]);

    const content = await readFile(file, 'utf-8');
    expect(content).toContain('status:Done');
  });

  it('rejects invalid priority', async () => {
    const program = buildProgram();
    await expect(
      program.parseAsync([
        'node', 'test', 'update', '1', '--file', file, '--priority', 'P5',
      ]),
    ).rejects.toThrow('Invalid priority');
  });
});
