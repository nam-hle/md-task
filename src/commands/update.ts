import { Command } from 'commander';
import { parseTaskFile, serializeTaskFile } from '../core/parser.js';
import {
  isValidPriority,
  isValidType,
  isValidStatus,
  type Priority,
  type TaskType,
  type Status,
} from '../core/task.js';
import { readTasksFile, writeTasksFile, fileExists } from '../shared/file.js';
import { formatJson } from '../shared/output.js';
import { taskNotFound, fileNotFound, validationError } from '../shared/errors.js';

export function createUpdateCommand(): Command {
  return new Command('update')
    .description('Update task attributes by ID')
    .argument('<id>', 'Task ID')
    .option('--description <value>', 'New description')
    .option('--priority <value>', 'New priority')
    .option('--scope <value>', 'New scope')
    .option('--type <value>', 'New type')
    .option('--status <value>', 'New status')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .action(async (idStr: string, opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;
      const id = parseInt(idStr, 10);

      if (isNaN(id)) {
        throw validationError(`Invalid task ID: ${idStr}`);
      }

      if (!opts.description && !opts.priority && !opts.scope && !opts.type && !opts.status) {
        throw validationError(
          'No update options provided. Use --description, --priority, --scope, --type, or --status',
        );
      }

      if (!(await fileExists(filePath))) {
        throw fileNotFound(filePath);
      }

      const content = await readTasksFile(filePath);
      const taskFile = parseTaskFile(content);
      const task = taskFile.tasks.find((t) => t.id === id);

      if (!task) {
        throw taskNotFound(id);
      }

      if (opts.description) task.description = opts.description;
      if (opts.priority) {
        if (!isValidPriority(opts.priority)) {
          throw validationError(
            `Invalid priority: ${opts.priority}. Use: critical, high, medium, low`,
          );
        }
        task.priority = opts.priority.toLowerCase() as Priority;
      }
      if (opts.scope) task.scope = opts.scope;
      if (opts.type) {
        if (!isValidType(opts.type)) {
          throw validationError(`Invalid type: ${opts.type}. Use: feature, bug, task, chore`);
        }
        task.type = opts.type.toLowerCase() as TaskType;
      }
      if (opts.status) {
        if (!isValidStatus(opts.status)) {
          throw validationError(
            `Invalid status: ${opts.status}. Use: todo, in-progress, done, cancelled`,
          );
        }
        task.status = opts.status.toLowerCase() as Status;
      }

      await writeTasksFile(filePath, serializeTaskFile(taskFile));

      if (format === 'json') {
        console.log(formatJson({ task }));
      } else {
        console.log(`Updated task ${task.id}: ${task.description}`);
      }
    });
}
