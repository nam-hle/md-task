import { Command } from 'commander';
import { parseTaskFile } from '../core/parser.js';
import { STATUSES, PRIORITIES } from '../core/task.js';
import { readTasksFile, fileExists } from '../shared/file.js';
import { formatJson } from '../shared/output.js';
import { fileNotFound } from '../shared/errors.js';

export function createStatsCommand(): Command {
  return new Command('stats')
    .description('Show task count summary')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .option('-q, --quiet', 'Minimal output (just total count)')
    .action(async (opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;

      if (!(await fileExists(filePath))) {
        throw fileNotFound(filePath);
      }

      const content = await readTasksFile(filePath);
      const taskFile = parseTaskFile(content);
      const tasks = taskFile.tasks;

      const byStatus: Record<string, number> = {};
      for (const s of STATUSES) {
        byStatus[s] = tasks.filter((t) => t.status === s).length;
      }

      const byPriority: Record<string, number> = {};
      for (const p of PRIORITIES) {
        byPriority[p] = tasks.filter((t) => t.priority === p).length;
      }

      const blocked = tasks.filter(
        (t) =>
          t.depends.length > 0 &&
          t.depends.some((depId) => {
            const dep = tasks.find((d) => d.id === depId);
            return !dep || dep.status !== 'done';
          }),
      ).length;

      const stats = { total: tasks.length, byStatus, byPriority, blocked };

      if (opts.quiet) {
        console.log(String(stats.total));
      } else if (format === 'json') {
        console.log(formatJson(stats));
      } else {
        const parts: string[] = [`Total: ${stats.total}`];
        for (const [status, count] of Object.entries(byStatus)) {
          if (count > 0) parts.push(`  ${status}: ${count}`);
        }
        if (blocked > 0) parts.push(`Blocked: ${blocked}`);
        console.log(parts.join('\n'));
      }
    });
}
