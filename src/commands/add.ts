import { Command } from 'commander';
import { parseTaskFile, serializeTaskFile } from '../core/parser.js';
import { applyDefaults, type TaskInput } from '../core/task.js';
import { nextId } from '../core/id.js';
import { readTasksFile, writeTasksFile, fileExists } from '../shared/file.js';
import { formatJson } from '../shared/output.js';
import { validationError } from '../shared/errors.js';
import { isValidField, parseIdList, formatId } from '../core/config.js';
import { taskWithFormattedId } from '../shared/output.js';

export function createAddCommand(): Command {
  return new Command('add')
    .description('Add a new task')
    .argument('<description>', 'Task description')
    .option('--priority <value>', 'Priority level')
    .option('--scope <value>', 'Scope label')
    .option('--type <value>', 'Task type')
    .option('--status <value>', 'Task status')
    .option('--depends-on <ids>', 'Comma-separated task IDs this depends on')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .option('-q, --quiet', 'Minimal output (just task ID)')
    .action(async (description: string, opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;

      if (!description.trim()) {
        throw validationError('Description cannot be empty');
      }

      let content = '';
      if (await fileExists(filePath)) {
        content = await readTasksFile(filePath);
      }

      const taskFile = content ? parseTaskFile(content) : parseTaskFile('---\n---\n# Tasks\n');
      const config = taskFile.config;

      for (const warning of taskFile.warnings) {
        console.error(`warning: ${warning}`);
      }

      if (opts.priority && !isValidField(opts.priority, config.fields.priority)) {
        throw validationError(
          `Invalid priority: ${opts.priority}. Use: ${config.fields.priority.join(', ')}`,
        );
      }
      if (opts.type && !isValidField(opts.type, config.fields.type)) {
        throw validationError(`Invalid type: ${opts.type}. Use: ${config.fields.type.join(', ')}`);
      }
      if (opts.status && !isValidField(opts.status, config.fields.status)) {
        throw validationError(
          `Invalid status: ${opts.status}. Use: ${config.fields.status.join(', ')}`,
        );
      }
      if (opts.scope && !isValidField(opts.scope, config.fields.scope)) {
        throw validationError(
          `Invalid scope: ${opts.scope}. Use: ${config.fields.scope?.join(', ') ?? '(any)'}`,
        );
      }

      let dependsStr: string | undefined;
      if (opts.dependsOn) {
        const { ids, invalid } = parseIdList(opts.dependsOn as string, config);
        if (invalid.length > 0) {
          throw validationError(
            `Invalid task ID(s) in --depends-on: ${invalid.join(', ')}. Expected format: ${formatId(0, config).replace(/0$/, '<n>')}`,
          );
        }
        dependsStr = ids.join(',');
      }

      const input: TaskInput = {
        description: description.trim(),
        priority: opts.priority,
        scope: opts.scope,
        type: opts.type,
        status: opts.status,
        depends: dependsStr,
      };

      const id = nextId(taskFile.tasks);
      const task = applyDefaults(input, id, config);
      taskFile.tasks.push(task);

      await writeTasksFile(filePath, serializeTaskFile(taskFile));

      const fid = formatId(task.id, config);
      if (opts.quiet) {
        console.log(fid);
      } else if (format === 'json') {
        console.log(formatJson({ task: taskWithFormattedId(task, config) }));
      } else {
        console.log(`Created task ${fid}: ${task.description}`);
      }
    });
}
