import { Command } from 'commander';
import { parseTaskFile } from '../core/parser.js';
import { readTasksFile, fileExists } from '../shared/file.js';
import { formatJson, formatTaskList } from '../shared/output.js';
import { fileNotFound } from '../shared/errors.js';

export function createSearchCommand(): Command {
  return new Command('search')
    .description('Search tasks by keyword in description and notes')
    .argument('<query>', 'Search query (case-insensitive)')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .action(async (query: string, opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;

      if (!(await fileExists(filePath))) {
        throw fileNotFound(filePath);
      }

      const content = await readTasksFile(filePath);
      const taskFile = parseTaskFile(content);

      const lowerQuery = query.toLowerCase();
      const matches = taskFile.tasks.filter((t) => {
        if (t.description.toLowerCase().includes(lowerQuery)) return true;
        return t.extraLines.some((line) => line.toLowerCase().includes(lowerQuery));
      });

      if (format === 'json') {
        console.log(formatJson({ tasks: matches, count: matches.length }));
      } else {
        console.log(formatTaskList(matches));
      }
    });
}
