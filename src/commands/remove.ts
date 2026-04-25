import { Command } from 'commander';
import { parseTaskFile, serializeTaskFile } from '../core/parser.js';
import { readTasksFile, writeTasksFile, fileExists } from '../shared/file.js';
import { formatJson } from '../shared/output.js';
import { taskNotFound, fileNotFound, validationError } from '../shared/errors.js';
import { parseId, formatId } from '../core/config.js';

export function createRemoveCommand(): Command {
  return new Command('remove')
    .description('Remove a task by ID')
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

      const taskIndex = taskFile.tasks.findIndex((t) => t.id === id);

      if (taskIndex === -1) {
        throw taskNotFound(formatId(id, config));
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- index validated by findIndex above
      const removed = taskFile.tasks[taskIndex]!;
      taskFile.tasks.splice(taskIndex, 1);

      await writeTasksFile(filePath, serializeTaskFile(taskFile));

      const fid = formatId(removed.id, config);
      if (opts.quiet) {
        console.log(fid);
      } else if (format === 'json') {
        console.log(
          formatJson({
            removed: { id: fid, description: removed.description },
          }),
        );
      } else {
        console.log(`Removed task ${fid}: ${removed.description}`);
      }
    });
}
