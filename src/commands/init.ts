import { Command } from 'commander';
import { writeTasksFile, fileExists } from '../shared/file.js';
import { formatJson } from '../shared/output.js';
import { fileAlreadyExists } from '../shared/errors.js';

const INITIAL_CONTENT = '# Tasks\n';

export function createInitCommand(): Command {
  return new Command('init')
    .description('Initialize an empty tasks file')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .action(async (opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;

      if (await fileExists(filePath)) {
        throw fileAlreadyExists(filePath);
      }

      await writeTasksFile(filePath, INITIAL_CONTENT);

      if (format === 'json') {
        console.log(formatJson({ created: filePath }));
      } else {
        console.log(`Created ${filePath}`);
      }
    });
}
