import { Command } from 'commander';
import { parseTaskFile, serializeTaskFile } from '../core/parser.js';
import { readTasksFile, writeTasksFile, fileExists } from '../shared/file.js';
import { formatJson } from '../shared/output.js';
import { taskNotFound, fileNotFound, validationError } from '../shared/errors.js';
import { isValidField, normalizeField, isValidTransition } from '../core/config.js';

export function createMoveCommand(): Command {
  return new Command('move')
    .description('Transition task to a new status')
    .argument('<id>', 'Task ID')
    .argument('<status>', 'Target status')
    .option('--force', 'Bypass transition validation')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .option('-q, --quiet', 'Minimal output (just task ID)')
    .action(async (idStr: string, status: string, opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;
      const id = parseInt(idStr, 10);

      if (isNaN(id)) {
        throw validationError(`Invalid task ID: ${idStr}`);
      }

      if (!(await fileExists(filePath))) {
        throw fileNotFound(filePath);
      }

      const content = await readTasksFile(filePath);
      const taskFile = parseTaskFile(content);
      const config = taskFile.config;

      if (!isValidField(status, config.fields.status)) {
        throw validationError(
          `Invalid status "${status}". Use: ${config.fields.status.join(', ')}`,
        );
      }

      const task = taskFile.tasks.find((t) => t.id === id);

      if (!task) {
        throw taskNotFound(id);
      }

      if (!opts.force && !isValidTransition(task.status, status, config.transitions)) {
        const allowed = config.transitions?.[task.status] ?? [];
        throw validationError(
          `Cannot transition from "${task.status}" to "${status}". Allowed: ${allowed.join(', ') || '(none)'}`,
        );
      }

      const normalized = normalizeField(status, config.fields.status);
      task.status = normalized;
      task.updated = new Date().toISOString().slice(0, 10);

      await writeTasksFile(filePath, serializeTaskFile(taskFile));

      if (opts.quiet) {
        console.log(String(task.id));
      } else if (format === 'json') {
        console.log(formatJson({ task }));
      } else {
        console.log(`Task ${task.id}: ${task.status} → ${normalized}`);
      }
    });
}
