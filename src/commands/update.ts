import { Command } from 'commander';
import { parseTaskFile, serializeTaskFile } from '../core/parser.js';
import { readTasksFile, writeTasksFile, fileExists } from '../shared/file.js';
import { formatJson } from '../shared/output.js';
import { taskNotFound, fileNotFound, validationError } from '../shared/errors.js';
import { isValidField, normalizeField, isValidTransition } from '../core/config.js';

export function createUpdateCommand(): Command {
  return new Command('update')
    .description('Update task attributes by ID')
    .argument('<id>', 'Task ID')
    .option('--description <value>', 'New description')
    .option('--priority <value>', 'New priority')
    .option('--scope <value>', 'New scope')
    .option('--type <value>', 'New type')
    .option('--status <value>', 'New status')
    .option('--depends-on <ids>', 'Comma-separated task IDs this depends on')
    .option('--note <text>', 'Append a note to the task')
    .option('--force', 'Bypass transition validation')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .option('-q, --quiet', 'Minimal output (just task ID)')
    .action(async (idStr: string, opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;
      const id = parseInt(idStr, 10);

      if (isNaN(id)) {
        throw validationError(`Invalid task ID: ${idStr}`);
      }

      if (
        !opts.description &&
        !opts.priority &&
        !opts.scope &&
        !opts.type &&
        !opts.status &&
        opts.dependsOn === undefined &&
        !opts.note
      ) {
        throw validationError(
          'No update options provided. Use --description, --priority, --scope, --type, or --status',
        );
      }

      if (!(await fileExists(filePath))) {
        throw fileNotFound(filePath);
      }

      const content = await readTasksFile(filePath);
      const taskFile = parseTaskFile(content);
      const config = taskFile.config;
      const task = taskFile.tasks.find((t) => t.id === id);

      if (!task) {
        throw taskNotFound(id);
      }

      if (opts.description) task.description = opts.description;
      if (opts.priority) {
        if (!isValidField(opts.priority, config.fields.priority)) {
          throw validationError(
            `Invalid priority: ${opts.priority}. Use: ${config.fields.priority.join(', ')}`,
          );
        }
        task.priority = normalizeField(opts.priority as string, config.fields.priority);
      }
      if (opts.scope) {
        if (!isValidField(opts.scope, config.fields.scope)) {
          throw validationError(
            `Invalid scope: ${opts.scope}. Use: ${config.fields.scope?.join(', ') ?? '(any)'}`,
          );
        }
        task.scope = opts.scope;
      }
      if (opts.type) {
        if (!isValidField(opts.type, config.fields.type)) {
          throw validationError(
            `Invalid type: ${opts.type}. Use: ${config.fields.type.join(', ')}`,
          );
        }
        task.type = normalizeField(opts.type as string, config.fields.type);
      }
      if (opts.status) {
        if (!isValidField(opts.status, config.fields.status)) {
          throw validationError(
            `Invalid status: ${opts.status}. Use: ${config.fields.status.join(', ')}`,
          );
        }
        if (!opts.force && !isValidTransition(task.status, opts.status, config.transitions)) {
          const allowed = config.transitions?.[task.status] ?? [];
          throw validationError(
            `Cannot transition from "${task.status}" to "${opts.status}". Allowed: ${allowed.join(', ') || '(none)'}`,
          );
        }
        task.status = normalizeField(opts.status as string, config.fields.status);
      }

      if (opts.note) {
        task.extraLines.push(`> ${opts.note}`);
      }

      if (opts.dependsOn !== undefined) {
        task.depends = opts.dependsOn
          ? (opts.dependsOn as string)
              .split(',')
              .map((s: string) => parseInt(s.trim(), 10))
              .filter((n: number) => !isNaN(n))
          : [];
      }

      task.updated = new Date().toISOString().slice(0, 10);

      await writeTasksFile(filePath, serializeTaskFile(taskFile));

      if (opts.quiet) {
        console.log(String(task.id));
      } else if (format === 'json') {
        console.log(formatJson({ task }));
      } else {
        console.log(`Updated task ${task.id}: ${task.description}`);
      }
    });
}
