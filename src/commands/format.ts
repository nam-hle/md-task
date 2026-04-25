import { Command } from 'commander';
import { parseTaskFile, serializeTaskFile } from '../core/parser.js';
import { readTasksFile, writeTasksFile, fileExists } from '../shared/file.js';
import { formatJson } from '../shared/output.js';
import { fileNotFound } from '../shared/errors.js';
import { isValidField, normalizeField } from '../core/config.js';

export function createFormatCommand(): Command {
  return new Command('format')
    .description('Reformat tasks file using current frontmatter (order, casing, normalization)')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--check', 'Exit non-zero if file is not already formatted; do not write')
    .option('--format <type>', 'Output format: text/json', 'text')
    .option('-q, --quiet', 'Minimal output')
    .action(async (opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;

      if (!(await fileExists(filePath))) {
        throw fileNotFound(filePath);
      }

      const before = await readTasksFile(filePath);
      const taskFile = parseTaskFile(before);
      const config = taskFile.config;

      for (const task of taskFile.tasks) {
        if (isValidField(task.priority, config.fields.priority)) {
          task.priority = normalizeField(task.priority, config.fields.priority);
        }
        if (isValidField(task.type, config.fields.type)) {
          task.type = normalizeField(task.type, config.fields.type);
        }
        if (isValidField(task.status, config.fields.status)) {
          task.status = normalizeField(task.status, config.fields.status);
        }
        if (config.fields.scope && isValidField(task.scope, config.fields.scope)) {
          task.scope = normalizeField(task.scope, config.fields.scope);
        }
      }

      const after = serializeTaskFile(taskFile);
      const changed = before !== after;

      for (const warning of taskFile.warnings) {
        console.error(`warning: ${warning}`);
      }

      if (opts.check) {
        if (opts.quiet) {
          console.log(changed ? 'changed' : 'ok');
        } else if (format === 'json') {
          console.log(formatJson({ file: filePath, changed }));
        } else {
          console.log(changed ? `${filePath}: needs formatting` : `${filePath}: already formatted`);
        }
        if (changed) process.exitCode = 1;
        return;
      }

      if (changed) {
        await writeTasksFile(filePath, after);
      }

      if (opts.quiet) {
        console.log(changed ? 'formatted' : 'unchanged');
      } else if (format === 'json') {
        console.log(formatJson({ file: filePath, changed }));
      } else {
        console.log(changed ? `Formatted ${filePath}` : `${filePath} already formatted`);
      }
    });
}
