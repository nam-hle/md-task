import { Command } from 'commander';
import { parseTaskFile, serializeTaskFile } from '../core/parser.js';
import { readTasksFile, writeTasksFile, fileExists } from '../shared/file.js';
import { formatJson } from '../shared/output.js';
import { taskNotFound, fileNotFound, validationError } from '../shared/errors.js';
import type { Status } from '../core/task.js';

export function createStatusShortcut(name: string, targetStatus: Status): Command {
  return new Command(name)
    .description(`Mark task as ${targetStatus}`)
    .argument('<id>', 'Task ID')
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

      if (!(await fileExists(filePath))) {
        throw fileNotFound(filePath);
      }

      const content = await readTasksFile(filePath);
      const taskFile = parseTaskFile(content);
      const task = taskFile.tasks.find((t) => t.id === id);

      if (!task) {
        throw taskNotFound(id);
      }

      task.status = targetStatus;
      task.updated = new Date().toISOString().slice(0, 10);

      await writeTasksFile(filePath, serializeTaskFile(taskFile));

      if (opts.quiet) {
        console.log(String(task.id));
      } else if (format === 'json') {
        console.log(formatJson({ task }));
      } else {
        console.log(`Task ${task.id} → ${targetStatus}`);
      }
    });
}
