import { Command } from 'commander';
import { parseTaskFile } from '../core/parser.js';
import type { Task } from '../core/task.js';
import { readTasksFile, fileExists } from '../shared/file.js';
import { formatJson, formatTaskList, taskWithFormattedId } from '../shared/output.js';
import { fileNotFound } from '../shared/errors.js';
import { formatId } from '../core/config.js';

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
    .option('-q, --quiet', 'Minimal output (one ID per line)')
    .action(async (opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;

      if (!(await fileExists(filePath))) {
        throw fileNotFound(filePath);
      }

      const content = await readTasksFile(filePath);
      const taskFile = parseTaskFile(content);
      const config = taskFile.config;

      for (const warning of taskFile.warnings) {
        console.error(`warning: ${warning}`);
      }

      let tasks: Task[] = taskFile.tasks;

      if (opts.priority) {
        const values = (opts.priority as string).toLowerCase().split(',');
        tasks = tasks.filter((t) => values.includes(t.priority));
      }
      if (opts.scope) {
        const values = (opts.scope as string).split(',');
        tasks = tasks.filter((t) => values.includes(t.scope));
      }
      if (opts.type) {
        const values = (opts.type as string).toLowerCase().split(',');
        tasks = tasks.filter((t) => values.includes(t.type));
      }
      if (opts.status) {
        const values = (opts.status as string).toLowerCase().split(',');
        tasks = tasks.filter((t) => values.includes(t.status));
      }

      if (opts.sort) {
        const field = opts.sort as string;
        const priorityOrder = Object.fromEntries(config.fields.priority.map((v, i) => [v, i]));
        const statusOrder = Object.fromEntries(config.fields.status.map((v, i) => [v, i]));
        tasks.sort((a, b) => {
          switch (field) {
            case 'priority':
              return (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
            case 'status':
              return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
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

      if (opts.quiet) {
        console.log(tasks.map((t) => formatId(t.id, config)).join('\n'));
      } else if (format === 'json') {
        const out = tasks.map((t) => taskWithFormattedId(t, config));
        console.log(formatJson({ tasks: out, count: out.length }));
      } else {
        console.log(formatTaskList(tasks, config));
      }
    });
}
