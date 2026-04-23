import { Command } from 'commander';
import { parseTaskFile } from '../core/parser.js';
import type { Task } from '../core/task.js';

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const STATUS_ORDER: Record<string, number> = {
  'in-progress': 0,
  todo: 1,
  done: 2,
  cancelled: 3,
};
import { readTasksFile, fileExists } from '../shared/file.js';
import { formatJson, formatTaskList } from '../shared/output.js';
import { fileNotFound } from '../shared/errors.js';

export function createListCommand(): Command {
  return new Command('list')
    .description('List tasks with optional filters')
    .option('--priority <value>', 'Filter by priority')
    .option('--scope <value>', 'Filter by scope')
    .option('--type <value>', 'Filter by type')
    .option('--status <value>', 'Filter by status')
    .option('--sort <field>', 'Sort by: priority/created/updated/status/id')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .action(async (opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;

      if (!(await fileExists(filePath))) {
        throw fileNotFound(filePath);
      }

      const content = await readTasksFile(filePath);
      const taskFile = parseTaskFile(content);

      for (const warning of taskFile.warnings) {
        console.error(`warning: ${warning}`);
      }

      let tasks: Task[] = taskFile.tasks;

      if (opts.priority) {
        tasks = tasks.filter((t) => t.priority === opts.priority.toLowerCase());
      }
      if (opts.scope) {
        tasks = tasks.filter((t) => t.scope === opts.scope);
      }
      if (opts.type) {
        tasks = tasks.filter((t) => t.type === opts.type.toLowerCase());
      }
      if (opts.status) {
        tasks = tasks.filter((t) => t.status === opts.status.toLowerCase());
      }

      if (opts.sort) {
        const field = opts.sort as string;
        tasks.sort((a, b) => {
          switch (field) {
            case 'priority':
              return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
            case 'status':
              return (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
            case 'created':
              return a.created.localeCompare(b.created);
            case 'updated':
              return a.updated.localeCompare(b.updated);
            case 'id':
              return a.id - b.id;
            default:
              return 0;
          }
        });
      }

      if (format === 'json') {
        console.log(formatJson({ tasks, count: tasks.length }));
      } else {
        console.log(formatTaskList(tasks));
      }
    });
}
