export const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const TYPES = ['feature', 'bug', 'task', 'chore'] as const;
export type TaskType = (typeof TYPES)[number];

export const STATUSES = ['todo', 'in-progress', 'done', 'cancelled'] as const;
export type Status = (typeof STATUSES)[number];

export interface Task {
  id: number;
  description: string;
  priority: Priority;
  scope: string;
  type: TaskType;
  status: Status;
  created: string;
  updated: string;
  depends: number[];
  extraLines: string[];
}

export interface TaskFile {
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

export function isValidPriority(value: string): value is Priority {
  return PRIORITIES.includes(value.toLowerCase() as Priority);
}

export function isValidType(value: string): value is TaskType {
  return TYPES.includes(value.toLowerCase() as TaskType);
}

export function isValidStatus(value: string): value is Status {
  return STATUSES.includes(value.toLowerCase() as Status);
}

export function applyDefaults(input: TaskInput, id: number): Task {
  return {
    id,
    description: input.description,
    priority: isValidPriority(input.priority ?? '')
      ? ((input.priority ?? '').toLowerCase() as Priority)
      : 'medium',
    scope: input.scope ?? 'general',
    type: isValidType(input.type ?? '') ? ((input.type ?? '').toLowerCase() as TaskType) : 'task',
    status: isValidStatus(input.status ?? '')
      ? ((input.status ?? '').toLowerCase() as Status)
      : 'todo',
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
