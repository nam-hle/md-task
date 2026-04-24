import { describe, it, expect } from 'vitest';
import { isValidTransition, validateConfig, DEFAULT_CONFIG } from '../../../src/core/config.js';

const TRANSITIONS: Record<string, string[]> = {
  todo: ['in-progress', 'cancelled'],
  'in-progress': ['review', 'todo', 'cancelled'],
  review: ['done', 'in-progress'],
  done: [],
  cancelled: [],
};

describe('isValidTransition', () => {
  it('allows valid transition', () => {
    expect(isValidTransition('todo', 'in-progress', TRANSITIONS)).toBe(true);
  });

  it('rejects invalid transition', () => {
    expect(isValidTransition('todo', 'done', TRANSITIONS)).toBe(false);
  });

  it('rejects transition from terminal state', () => {
    expect(isValidTransition('done', 'todo', TRANSITIONS)).toBe(false);
  });

  it('allows all transitions when transitions is null', () => {
    expect(isValidTransition('done', 'todo', null)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isValidTransition('TODO', 'In-Progress', TRANSITIONS)).toBe(true);
  });

  it('rejects unknown source status', () => {
    expect(isValidTransition('unknown', 'todo', TRANSITIONS)).toBe(false);
  });
});

describe('validateConfig with transitions', () => {
  it('passes with valid transitions', () => {
    const config = {
      ...DEFAULT_CONFIG,
      fields: {
        ...DEFAULT_CONFIG.fields,
        status: ['todo', 'in-progress', 'review', 'done', 'cancelled'],
      },
      transitions: TRANSITIONS,
    };
    const errors = validateConfig(config);
    expect(errors).toEqual([]);
  });

  it('reports unknown source status in transitions', () => {
    const config = {
      ...DEFAULT_CONFIG,
      transitions: { unknown: ['todo'] },
    };
    const errors = validateConfig(config);
    expect(errors.some((e) => e.includes('Transition source "unknown"'))).toBe(true);
  });

  it('reports unknown target status in transitions', () => {
    const config = {
      ...DEFAULT_CONFIG,
      transitions: { todo: ['nonexistent'] },
    };
    const errors = validateConfig(config);
    expect(errors.some((e) => e.includes('Transition target "nonexistent"'))).toBe(true);
  });
});
