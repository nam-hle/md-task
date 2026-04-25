import type { Task } from '../core/task.js';
import { type TaskConfig, formatId } from '../core/config.js';

export function taskWithFormattedId(task: Task, config: TaskConfig): Omit<Task, 'id'> & { id: string } {
  return { ...task, id: formatId(task.id, config) };
}

export function formatTaskCompact(task: Task, config: TaskConfig): string {
  return [
    formatId(task.id, config),
    task.status,
    task.priority,
    task.scope,
    task.type,
    task.description,
  ].join('\t');
}

export function formatTaskDetail(task: Task, config: TaskConfig): string {
  return [
    `Task ${formatId(task.id, config)}`,
    `  Description: ${task.description}`,
    `  Priority:    ${task.priority}`,
    `  Scope:       ${task.scope}`,
    `  Type:        ${task.type}`,
    `  Status:      ${task.status}`,
    `  Created:     ${task.created}`,
    `  Updated:     ${task.updated}`,
  ].join('\n');
}

export function formatTaskList(tasks: Task[], config: TaskConfig): string {
  if (tasks.length === 0) return 'No tasks found.';

  const header = 'ID\tSTATUS\tPRIORITY\tSCOPE\tTYPE\tDESCRIPTION';
  const rows = tasks.map((t) => formatTaskCompact(t, config));
  return [header, ...rows].join('\n');
}

export function formatJson(data: unknown): string {
  return JSON.stringify(data);
}
