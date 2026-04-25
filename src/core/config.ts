import { parse as parseYaml } from 'yaml';

export interface IdConfig {
  prefix: string;
  separator: string;
}

export type FieldName = 'priority' | 'type' | 'status' | 'scope';

export interface TaskConfig {
  id: IdConfig;
  fields: {
    priority: string[];
    type: string[];
    status: string[];
    scope: string[] | null;
    terminal: string[];
  };
  fieldOrder: FieldName[];
  transitions: Record<string, string[]> | null;
  defaults: {
    priority: string;
    type: string;
    status: string;
    scope: string;
  };
}

const ORDERABLE_FIELDS: readonly FieldName[] = ['status', 'type', 'priority', 'scope'];

export const DEFAULT_CONFIG: TaskConfig = {
  id: { prefix: 'T', separator: '-' },
  fields: {
    priority: ['critical', 'high', 'medium', 'low'],
    type: ['feature', 'bug', 'task', 'chore'],
    status: ['todo', 'in-progress', 'done', 'cancelled'],
    scope: null,
    terminal: ['done', 'cancelled'],
  },
  fieldOrder: ['status', 'type', 'priority', 'scope'],
  transitions: null,
  defaults: {
    priority: 'medium',
    type: 'task',
    status: 'todo',
    scope: 'general',
  },
};

export function parseConfig(yamlStr: string): TaskConfig {
  const raw = parseYaml(yamlStr) as Record<string, unknown> | null;
  if (!raw) return { ...DEFAULT_CONFIG };

  const rawId = raw.id as Record<string, string> | undefined;
  const rawFields = raw.fields as Record<string, string[]> | undefined;
  const rawTransitions = raw.transitions as Record<string, string[]> | undefined;
  const rawDefaults = raw.defaults as Record<string, string> | undefined;

  const id: IdConfig = {
    prefix: rawId?.prefix ?? DEFAULT_CONFIG.id.prefix,
    separator: rawId?.separator ?? DEFAULT_CONFIG.id.separator,
  };

  const fields = {
    priority: rawFields?.priority ?? DEFAULT_CONFIG.fields.priority,
    type: rawFields?.type ?? DEFAULT_CONFIG.fields.type,
    status: rawFields?.status ?? DEFAULT_CONFIG.fields.status,
    scope: rawFields?.scope ?? DEFAULT_CONFIG.fields.scope,
    terminal: rawFields?.terminal ?? DEFAULT_CONFIG.fields.terminal,
  };

  const fieldOrder = computeFieldOrder(rawFields);

  const transitions: Record<string, string[]> | null = rawTransitions ?? null;

  const defaults = {
    priority: rawDefaults?.priority ?? DEFAULT_CONFIG.defaults.priority,
    type: rawDefaults?.type ?? DEFAULT_CONFIG.defaults.type,
    status: rawDefaults?.status ?? DEFAULT_CONFIG.defaults.status,
    scope: rawDefaults?.scope ?? DEFAULT_CONFIG.defaults.scope,
  };

  return { id, fields, fieldOrder, transitions, defaults };
}

function computeFieldOrder(rawFields: Record<string, unknown> | undefined): FieldName[] {
  if (!rawFields) return [...DEFAULT_CONFIG.fieldOrder];
  const order: FieldName[] = [];
  for (const key of Object.keys(rawFields)) {
    if (ORDERABLE_FIELDS.includes(key as FieldName) && !order.includes(key as FieldName)) {
      order.push(key as FieldName);
    }
  }
  for (const f of DEFAULT_CONFIG.fieldOrder) {
    if (!order.includes(f)) order.push(f);
  }
  return order;
}

export function validateConfig(config: TaskConfig): string[] {
  const errors: string[] = [];

  if (!config.fields.priority.includes(config.defaults.priority)) {
    errors.push(
      `Default priority "${config.defaults.priority}" not in allowed values: ${config.fields.priority.join(', ')}`,
    );
  }
  if (!config.fields.type.includes(config.defaults.type)) {
    errors.push(
      `Default type "${config.defaults.type}" not in allowed values: ${config.fields.type.join(', ')}`,
    );
  }
  if (!config.fields.status.includes(config.defaults.status)) {
    errors.push(
      `Default status "${config.defaults.status}" not in allowed values: ${config.fields.status.join(', ')}`,
    );
  }
  if (config.fields.scope && !config.fields.scope.includes(config.defaults.scope)) {
    errors.push(
      `Default scope "${config.defaults.scope}" not in allowed values: ${config.fields.scope.join(', ')}`,
    );
  }
  for (const t of config.fields.terminal) {
    if (!config.fields.status.includes(t)) {
      errors.push(
        `Terminal status "${t}" not in status values: ${config.fields.status.join(', ')}`,
      );
    }
  }

  if (config.transitions) {
    for (const [from, targets] of Object.entries(config.transitions)) {
      if (!config.fields.status.includes(from)) {
        errors.push(
          `Transition source "${from}" not in status values: ${config.fields.status.join(', ')}`,
        );
      }
      for (const to of targets) {
        if (!config.fields.status.includes(to)) {
          errors.push(
            `Transition target "${to}" (from "${from}") not in status values: ${config.fields.status.join(', ')}`,
          );
        }
      }
    }
  }

  return errors;
}

export function formatId(id: number, config: TaskConfig): string {
  return `${config.id.prefix}${config.id.separator}${id}`;
}

export function parseId(idStr: string, config: TaskConfig): number | null {
  const prefix = escapeRegex(config.id.prefix);
  const separator = escapeRegex(config.id.separator);
  const re = new RegExp(`^${prefix}${separator}(\\d+)$`);
  const match = re.exec(idStr.trim());
  if (!match?.[1]) return null;
  return parseInt(match[1], 10);
}

export function parseIdList(idsStr: string, config: TaskConfig): { ids: number[]; invalid: string[] } {
  const ids: number[] = [];
  const invalid: string[] = [];
  for (const part of idsStr.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const id = parseId(trimmed, config);
    if (id === null) invalid.push(trimmed);
    else ids.push(id);
  }
  return { ids, invalid };
}

export function parseIdFromHeading(heading: string, config: TaskConfig): number | null {
  const prefix = escapeRegex(config.id.prefix);
  const separator = escapeRegex(config.id.separator);
  const re = new RegExp(`^###\\s+${prefix}${separator}(\\d+)\\s*$`);
  const match = re.exec(heading);
  if (!match?.[1]) return null;
  return parseInt(match[1], 10);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isValidField(value: string, allowed: string[] | null): boolean {
  if (!allowed) return true;
  return allowed.some((a) => a.toLowerCase() === value.toLowerCase());
}

export function isValidTransition(
  from: string,
  to: string,
  transitions: Record<string, string[]> | null,
): boolean {
  if (!transitions) return true;
  const allowed = Object.entries(transitions).find(
    ([key]) => key.toLowerCase() === from.toLowerCase(),
  );
  if (!allowed) return false;
  return allowed[1].some((a) => a.toLowerCase() === to.toLowerCase());
}

export function normalizeField(value: string, allowed: string[]): string {
  const match = allowed.find((a) => a.toLowerCase() === value.toLowerCase());
  return match ?? value;
}

export function serializeConfig(config: TaskConfig): string {
  const lines: string[] = ['---'];

  lines.push('id:');
  lines.push(`  prefix: ${config.id.prefix}`);
  lines.push(`  separator: "${config.id.separator}"`);

  lines.push('fields:');
  for (const f of config.fieldOrder) {
    if (f === 'scope') {
      if (config.fields.scope) {
        lines.push(`  scope: [${config.fields.scope.join(', ')}]`);
      }
    } else {
      lines.push(`  ${f}: [${config.fields[f].join(', ')}]`);
    }
  }
  lines.push(`  terminal: [${config.fields.terminal.join(', ')}]`);

  if (config.transitions) {
    lines.push('transitions:');
    for (const [from, targets] of Object.entries(config.transitions)) {
      lines.push(`  ${from}: [${targets.join(', ')}]`);
    }
  }

  lines.push('defaults:');
  lines.push(`  priority: ${config.defaults.priority}`);
  lines.push(`  type: ${config.defaults.type}`);
  lines.push(`  status: ${config.defaults.status}`);
  lines.push(`  scope: ${config.defaults.scope}`);

  lines.push('---');
  return lines.join('\n');
}
