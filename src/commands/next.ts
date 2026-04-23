import { Command } from 'commander';
import { parseTaskFile } from '../core/parser.js';
import type { Task, Priority } from '../core/task.js';
import { readTasksFile, fileExists } from '../shared/file.js';
import { formatJson, formatTaskDetail } from '../shared/output.js';
import { fileNotFound, EXIT_NOT_FOUND } from '../shared/errors.js';

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

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

      let candidates = taskFile.tasks.filter(
        (t) => t.status === 'todo' || t.status === 'in-progress',
      );

      candidates = candidates.filter((t) => !isBlocked(t, taskFile.tasks));

      if (opts.scope) {
        candidates = candidates.filter((t) => t.scope === opts.scope);
      }
      if (opts.type) {
        candidates = candidates.filter((t) => t.type === (opts.type as string).toLowerCase());
      }

      candidates.sort((a, b) => {
        if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
        if (b.status === 'in-progress' && a.status !== 'in-progress') return 1;
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
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
