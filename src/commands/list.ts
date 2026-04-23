import { Command } from 'commander';
import { parseTaskFile } from '../core/parser.js';
import type { Task } from '../core/task.js';
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

      if (format === 'json') {
        console.log(formatJson({ tasks, count: tasks.length }));
      } else {
        console.log(formatTaskList(tasks));
      }
    });
}
