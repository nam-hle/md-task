import { Command } from 'commander';
import { writeTasksFile, fileExists } from '../shared/file.js';
import { formatJson } from '../shared/output.js';
import { fileAlreadyExists } from '../shared/errors.js';
import { DEFAULT_CONFIG, serializeConfig } from '../core/config.js';

export function createInitCommand(): Command {
  return new Command('init')
    .description('Initialize an empty tasks file')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .option('-q, --quiet', 'Minimal output')
    .action(async (opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;

      if (await fileExists(filePath)) {
        throw fileAlreadyExists(filePath);
      }

      const content = serializeConfig(DEFAULT_CONFIG) + '\n\n# Tasks\n';

      await writeTasksFile(filePath, content);

      if (opts.quiet) {
        console.log(filePath);
      } else if (format === 'json') {
        console.log(formatJson({ created: filePath }));
      } else {
        console.log(`Created ${filePath}`);
      }
    });
}
