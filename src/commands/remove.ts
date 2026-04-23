import { Command } from 'commander';
import { parseTaskFile, serializeTaskFile } from '../core/parser.js';
import { readTasksFile, writeTasksFile, fileExists } from '../shared/file.js';
import { formatJson } from '../shared/output.js';
import { taskNotFound, fileNotFound, validationError } from '../shared/errors.js';

export function createRemoveCommand(): Command {
  return new Command('remove')
    .description('Remove a task by ID')
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
      const taskIndex = taskFile.tasks.findIndex((t) => t.id === id);

      if (taskIndex === -1) {
        throw taskNotFound(id);
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- index validated by findIndex above
      const removed = taskFile.tasks[taskIndex]!;
      taskFile.tasks.splice(taskIndex, 1);

      await writeTasksFile(filePath, serializeTaskFile(taskFile));

      if (format === 'json') {
        console.log(
          formatJson({
            removed: { id: removed.id, description: removed.description },
          }),
        );
      } else {
        console.log(`Removed task ${removed.id}: ${removed.description}`);
      }
    });
}
