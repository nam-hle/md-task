import { Command } from 'commander';
import { parseTaskFile } from '../core/parser.js';
import { readTasksFile, fileExists } from '../shared/file.js';
import { formatJson, formatTaskList, taskWithFormattedId } from '../shared/output.js';
import { fileNotFound } from '../shared/errors.js';
import { formatId } from '../core/config.js';

export function createSearchCommand(): Command {
  return new Command('search')
    .description('Search tasks by keyword in description and notes')
    .argument('<query>', 'Search query (case-insensitive)')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .option('-q, --quiet', 'Minimal output (one ID per line)')
    .action(async (query: string, opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;

      if (!(await fileExists(filePath))) {
        throw fileNotFound(filePath);
      }

      const content = await readTasksFile(filePath);
      const taskFile = parseTaskFile(content);
      const config = taskFile.config;

      const lowerQuery = query.toLowerCase();
      const matches = taskFile.tasks.filter((t) => {
        if (t.description.toLowerCase().includes(lowerQuery)) return true;
        return t.extraLines.some((line) => line.toLowerCase().includes(lowerQuery));
      });

      if (opts.quiet) {
        console.log(matches.map((t) => formatId(t.id, config)).join('\n'));
      } else if (format === 'json') {
        const out = matches.map((t) => taskWithFormattedId(t, config));
        console.log(formatJson({ tasks: out, count: out.length }));
      } else {
        console.log(formatTaskList(matches, config));
      }
    });
}
