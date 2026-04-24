import { describe, it, expect } from 'vitest';
import { isValidField, normalizeField } from '../../../src/core/config.js';

describe('isValidField', () => {
  it('accepts exact-case match', () => {
    expect(isValidField('P1', ['P0', 'P1', 'P2'])).toBe(true);
  });

  it('accepts lowercase input against uppercase allowed', () => {
    expect(isValidField('p1', ['P0', 'P1', 'P2'])).toBe(true);
  });

  it('accepts uppercase input against lowercase allowed', () => {
    expect(isValidField('HIGH', ['critical', 'high', 'medium', 'low'])).toBe(true);
  });

  it('rejects value not in allowed list', () => {
    expect(isValidField('P5', ['P0', 'P1', 'P2'])).toBe(false);
  });

  it('allows anything when allowed is null', () => {
    expect(isValidField('anything', null)).toBe(true);
  });
});

describe('normalizeField', () => {
  it('returns schema-defined casing', () => {
    expect(normalizeField('p1', ['P0', 'P1', 'P2'])).toBe('P1');
  });

  it('returns schema-defined casing for lowercase schema', () => {
    expect(normalizeField('HIGH', ['critical', 'high', 'medium', 'low'])).toBe('high');
  });

  it('returns input unchanged when no match', () => {
    expect(normalizeField('P5', ['P0', 'P1', 'P2'])).toBe('P5');
  });
});
