import { Command } from 'commander';
import { parseTaskFile } from '../core/parser.js';
import { readTasksFile, fileExists } from '../shared/file.js';
import { formatJson, formatTaskDetail } from '../shared/output.js';
import { taskNotFound, fileNotFound, validationError } from '../shared/errors.js';

export function createViewCommand(): Command {
  return new Command('view')
    .description('View a single task by ID')
    .argument('<id>', 'Task ID')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .action(async (idStr: string, opts) => {
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
      const task = taskFile.tasks.find((t) => t.id === id);

      if (!task) {
        throw taskNotFound(id);
      }

      if (format === 'json') {
        console.log(formatJson({ task }));
      } else {
        console.log(formatTaskDetail(task));
      }
    });
}
