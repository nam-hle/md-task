import { Command } from 'commander';
import { parseTaskFile } from '../core/parser.js';
import type { Task } from '../core/task.js';
import { readTasksFile, fileExists } from '../shared/file.js';
import { formatJson, formatTaskDetail } from '../shared/output.js';
import { fileNotFound, EXIT_NOT_FOUND } from '../shared/errors.js';

function isBlocked(task: Task, tasks: Task[]): boolean {
  if (task.depends.length === 0) return false;
  return task.depends.some((depId) => {
    const dep = tasks.find((t) => t.id === depId);
    return !dep || dep.status !== 'done';
  });
}

export function createNextCommand(): Command {
  return new Command('next')
    .description('Show highest-priority actionable task')
    .option('--scope <value>', 'Filter by scope')
    .option('--type <value>', 'Filter by type')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .option('-q, --quiet', 'Minimal output (just task ID)')
    .action(async (opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;

      if (!(await fileExists(filePath))) {
        throw fileNotFound(filePath);
      }

      const content = await readTasksFile(filePath);
      const taskFile = parseTaskFile(content);
      const config = taskFile.config;
      const terminal = config.fields.terminal;

      let candidates = taskFile.tasks.filter((t) => !terminal.includes(t.status));

      candidates = candidates.filter((t) => !isBlocked(t, taskFile.tasks));

      if (opts.scope) {
        candidates = candidates.filter((t) => t.scope === opts.scope);
      }
      if (opts.type) {
        candidates = candidates.filter((t) => t.type === (opts.type as string).toLowerCase());
      }

      const priorityOrder = Object.fromEntries(config.fields.priority.map((v, i) => [v, i]));
      const statusOrder = Object.fromEntries(config.fields.status.map((v, i) => [v, i]));

      candidates.sort((a, b) => {
        const statusDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        return (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
      });

      const next = candidates[0];

      if (!next) {
        if (opts.quiet) {
          // empty output
        } else if (format === 'json') {
          console.log(formatJson({ task: null }));
        } else {
          console.log('No actionable tasks.');
        }
        process.exitCode = EXIT_NOT_FOUND;
        return;
      }

      if (opts.quiet) {
        console.log(String(next.id));
      } else if (format === 'json') {
        console.log(formatJson({ task: next }));
      } else {
        console.log(formatTaskDetail(next));
      }
    });
}
