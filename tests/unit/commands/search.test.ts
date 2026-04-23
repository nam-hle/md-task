import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { createSearchCommand } from '../../../src/commands/search.js';

const FIXTURES = join(import.meta.dirname, '../../fixtures');

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createSearchCommand());
  return program;
}

describe('search command', () => {
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

  it('finds tasks by description keyword', async () => {
    const program = buildProgram();
    await program.parseAsync([
      'node',
      'test',
      'search',
      'login',
      '--file',
      file,
      '--format',
      'json',
    ]);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.count).toBe(1);
    expect(parsed.tasks[0].description).toContain('login');
  });

  it('search is case-insensitive', async () => {
    const program = buildProgram();
    await program.parseAsync([
      'node',
      'test',
      'search',
      'LOGIN',
      '--file',
      file,
      '--format',
      'json',
    ]);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.count).toBe(1);
  });

  it('returns empty when no match', async () => {
    const program = buildProgram();
    await program.parseAsync([
      'node',
      'test',
      'search',
      'nonexistent',
      '--file',
      file,
      '--format',
      'json',
    ]);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.count).toBe(0);
  });
});
