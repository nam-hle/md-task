import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { createStatsCommand } from '../../../src/commands/stats.js';

const FIXTURES = join(import.meta.dirname, '../../fixtures');

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  program.addCommand(createStatsCommand());
  return program;
}

describe('stats command', () => {
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

  it('outputs correct counts as JSON', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'stats', '--file', file, '--format', 'json']);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.total).toBe(3);
    expect(parsed.byStatus.todo).toBe(1);
    expect(parsed.byStatus['in-progress']).toBe(1);
    expect(parsed.byStatus.done).toBe(1);
  });

  it('outputs text summary', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'stats', '--file', file]);

    const output: string = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(output).toContain('Total: 3');
    expect(output).toContain('todo: 1');
  });
});
