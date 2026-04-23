import { type TaskConfig, DEFAULT_CONFIG, isValidField } from './config.js';

export interface Task {
  id: number;
  description: string;
  priority: string;
  scope: string;
  type: string;
  status: string;
  created: string;
  updated: string;
  depends: number[];
  extraLines: string[];
}

export interface TaskFile {
  config: TaskConfig;
  header: string[];
  tasks: Task[];
  warnings: string[];
}

export interface TaskInput {
  description: string;
  priority?: string;
  scope?: string;
  type?: string;
  status?: string;
  depends?: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function applyDefaults(
  input: TaskInput,
  id: number,
  config: TaskConfig = DEFAULT_CONFIG,
): Task {
  const priority =
    input.priority && isValidField(input.priority, config.fields.priority)
      ? input.priority.toLowerCase()
      : config.defaults.priority;

  const type =
    input.type && isValidField(input.type, config.fields.type)
      ? input.type.toLowerCase()
      : config.defaults.type;

  const status =
    input.status && isValidField(input.status, config.fields.status)
      ? input.status.toLowerCase()
      : config.defaults.status;

  const scope = input.scope
    ? isValidField(input.scope, config.fields.scope)
      ? input.scope
      : config.defaults.scope
    : config.defaults.scope;

  return {
    id,
    description: input.description,
    priority,
    scope,
    type,
    status,
    created: today(),
    updated: today(),
    depends: input.depends
      ? input.depends
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n))
      : [],
    extraLines: [],
  };
}
