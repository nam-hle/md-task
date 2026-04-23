import type { Task } from '../core/task.js';

export function formatTaskCompact(task: Task): string {
  return [
    String(task.id),
    task.status,
    task.priority,
    task.scope,
    task.type,
    task.description,
  ].join('\t');
}

export function formatTaskDetail(task: Task): string {
  return [
    `Task ${task.id}`,
    `  Description: ${task.description}`,
    `  Priority:    ${task.priority}`,
    `  Scope:       ${task.scope}`,
    `  Type:        ${task.type}`,
    `  Status:      ${task.status}`,
    `  Created:     ${task.created}`,
    `  Updated:     ${task.updated}`,
  ].join('\n');
}

export function formatTaskList(tasks: Task[]): string {
  if (tasks.length === 0) return 'No tasks found.';

  const header = 'ID\tSTATUS\tPRIORITY\tSCOPE\tTYPE\tDESCRIPTION';
  const rows = tasks.map(formatTaskCompact);
  return [header, ...rows].join('\n');
}

export function formatJson(data: unknown): string {
  return JSON.stringify(data);
}
