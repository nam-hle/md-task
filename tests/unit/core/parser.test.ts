import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTaskFile, serializeTaskFile } from '../../../src/core/parser.js';

const FIXTURES = join(import.meta.dirname, '../../fixtures');

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf-8');
}

describe('parseTaskFile', () => {
  it('parses valid file with 3 tasks', () => {
    const content = readFixture('valid.md');
    const result = parseTaskFile(content);

    expect(result.tasks).toHaveLength(3);
    expect(result.warnings).toHaveLength(0);
    expect(result.header.join('\n')).toContain('# Tasks');
  });

  it('extracts task attributes correctly', () => {
    const content = readFixture('valid.md');
    const result = parseTaskFile(content);
    const task1 = result.tasks[0]!;

    expect(task1.id).toBe(1);
    expect(task1.description).toBe('Fix login timeout');
    expect(task1.type).toBe('bug');
    expect(task1.priority).toBe('high');
    expect(task1.scope).toBe('backend');
    expect(task1.status).toBe('todo');
    expect(task1.created).toBe('2026-04-23');
    expect(task1.updated).toBe('2026-04-23');
  });

  it('parses empty file', () => {
    const content = readFixture('empty.md');
    const result = parseTaskFile(content);

    expect(result.tasks).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.header.join('\n')).toContain('# Tasks');
  });

  it('parses completely empty string', () => {
    const result = parseTaskFile('');
    expect(result.tasks).toHaveLength(0);
    expect(result.header).toEqual(['']);
  });
});

describe('parseTaskFile (lenient)', () => {
  it('skips tasks with invalid IDs', () => {
    const content = readFixture('malformed.md');
    const result = parseTaskFile(content);

    const ids = result.tasks.map((t) => t.id);
    expect(ids).not.toContain(NaN);
  });

  it('handles tags without commas', () => {
    const content = readFixture('malformed.md');
    const result = parseTaskFile(content);

    const task2 = result.tasks.find((t) => t.id === 2);
    expect(task2).toBeDefined();
    expect(task2!.description).toBe('Add caching layer');
  });

  it('preserves extra lines in task blocks', () => {
    const content = readFixture('malformed.md');
    const result = parseTaskFile(content);

    const task2 = result.tasks.find((t) => t.id === 2);
    expect(task2?.extraLines.some((l) => l.includes('extra line'))).toBe(true);
  });

  it('warns on empty task blocks', () => {
    const content = readFixture('malformed.md');
    const result = parseTaskFile(content);

    expect(result.warnings.some((w) => w.includes('Task 3'))).toBe(true);
  });
});

describe('depends field', () => {
  it('parses depends field', () => {
    const content =
      '# Tasks\n\n### T-1\ntype:task, priority:medium, scope:general, status:todo, created:2026-01-01, updated:2026-01-01, depends:2,3\nFoo\n';
    const result = parseTaskFile(content);
    expect(result.tasks[0]!.depends).toEqual([2, 3]);
  });

  it('serializes depends field only when non-empty', () => {
    const content =
      '# Tasks\n\n### T-1\ntype:task, priority:medium, scope:general, status:todo, created:2026-01-01, updated:2026-01-01\nFoo\n';
    const parsed = parseTaskFile(content);
    const serialized = serializeTaskFile(parsed);
    expect(serialized).not.toContain('depends:');
  });
});

describe('serializeTaskFile', () => {
  it('round-trips a valid file', () => {
    const content = readFixture('valid.md');
    const parsed = parseTaskFile(content);
    const serialized = serializeTaskFile(parsed);
    const reparsed = parseTaskFile(serialized);

    expect(reparsed.tasks).toHaveLength(parsed.tasks.length);
    for (let i = 0; i < parsed.tasks.length; i++) {
      expect(reparsed.tasks[i]!.id).toBe(parsed.tasks[i]!.id);
      expect(reparsed.tasks[i]!.description).toBe(parsed.tasks[i]!.description);
      expect(reparsed.tasks[i]!.priority).toBe(parsed.tasks[i]!.priority);
      expect(reparsed.tasks[i]!.status).toBe(parsed.tasks[i]!.status);
    }
  });

  it('preserves header lines', () => {
    const content = readFixture('valid.md');
    const parsed = parseTaskFile(content);
    const serialized = serializeTaskFile(parsed);

    expect(serialized).toMatch(/^---/);
    expect(serialized).toContain('# Tasks');
  });

  it('ends with newline', () => {
    const content = readFixture('valid.md');
    const parsed = parseTaskFile(content);
    const serialized = serializeTaskFile(parsed);

    expect(serialized.endsWith('\n')).toBe(true);
  });
});
