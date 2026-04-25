import { Command } from 'commander';
import { parseTaskFile } from '../core/parser.js';
import { readTasksFile, fileExists } from '../shared/file.js';
import { formatJson, formatTaskDetail, taskWithFormattedId } from '../shared/output.js';
import { taskNotFound, fileNotFound, validationError } from '../shared/errors.js';
import { parseId, formatId } from '../core/config.js';

export function createViewCommand(): Command {
  return new Command('view')
    .description('View a single task by ID')
    .argument('<id>', 'Task ID')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .option('-q, --quiet', 'Minimal output (just task ID)')
    .action(async (idStr: string, opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;

      if (!(await fileExists(filePath))) {
        throw fileNotFound(filePath);
      }

      const content = await readTasksFile(filePath);
      const taskFile = parseTaskFile(content);
      const config = taskFile.config;

      const id = parseId(idStr, config);
      if (id === null) {
        throw validationError(
          `Invalid task ID: "${idStr}". Expected format: ${formatId(0, config).replace(/0$/, '<n>')}`,
        );
      }

      const task = taskFile.tasks.find((t) => t.id === id);

      if (!task) {
        throw taskNotFound(formatId(id, config));
      }

      if (opts.quiet) {
        console.log(formatId(task.id, config));
      } else if (format === 'json') {
        console.log(formatJson({ task: taskWithFormattedId(task, config) }));
      } else {
        console.log(formatTaskDetail(task, config));
      }
    });
}
