import { Command } from 'commander';
import { parseTaskFile } from '../core/parser.js';
import type { Task } from '../core/task.js';
import { readTasksFile, fileExists } from '../shared/file.js';
import { formatJson, formatTaskList, taskWithFormattedId } from '../shared/output.js';
import { fileNotFound } from '../shared/errors.js';
import { formatId, type TaskConfig, DEFAULT_CONFIG } from '../core/config.js';
import { valuesHelp } from '../shared/cli-config.js';

export function createListCommand(config: TaskConfig = DEFAULT_CONFIG): Command {
  const cmd = new Command('list')
    .description('List tasks with optional filters')
    .option('--priority <value>', `Filter by priority (${valuesHelp(config.fields.priority)})`)
    .option('--type <value>', `Filter by type (${valuesHelp(config.fields.type)})`)
    .option('--status <value>', `Filter by status (${valuesHelp(config.fields.status)})`)
    .option(
      '--scope <value>',
      config.fields.scope
        ? `Filter by scope (${valuesHelp(config.fields.scope)})`
        : 'Filter by scope',
    )
    .option('--sort <field>', 'Sort by: priority/created/updated/status/id')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .option('-q, --quiet', 'Minimal output (one ID per line)')
    .action(async (opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;

      if (!(await fileExists(filePath))) {
        throw fileNotFound(filePath);
      }

      const content = await readTasksFile(filePath);
      const taskFile = parseTaskFile(content);
      const config = taskFile.config;

      for (const warning of taskFile.warnings) {
        console.error(`warning: ${warning}`);
      }

      let tasks: Task[] = taskFile.tasks;

      const matchAny = (taskVal: string, csv: string): boolean =>
        csv.split(',').some((v) => v.trim().toLowerCase() === taskVal.toLowerCase());

      if (opts.priority) tasks = tasks.filter((t) => matchAny(t.priority, opts.priority as string));
      if (opts.scope) tasks = tasks.filter((t) => matchAny(t.scope, opts.scope as string));
      if (opts.type) tasks = tasks.filter((t) => matchAny(t.type, opts.type as string));
      if (opts.status) tasks = tasks.filter((t) => matchAny(t.status, opts.status as string));

      if (opts.sort) {
        const field = opts.sort as string;
        const priorityOrder = Object.fromEntries(config.fields.priority.map((v, i) => [v, i]));
        const statusOrder = Object.fromEntries(config.fields.status.map((v, i) => [v, i]));
        tasks.sort((a, b) => {
          switch (field) {
            case 'priority':
              return (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
            case 'status':
              return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
            case 'created':
              return a.created.localeCompare(b.created);
            case 'updated':
              return a.updated.localeCompare(b.updated);
            case 'id':
              return a.id - b.id;
            default:
              return 0;
          }
        });
      }

      if (opts.quiet) {
        console.log(tasks.map((t) => formatId(t.id, config)).join('\n'));
      } else if (format === 'json') {
        const out = tasks.map((t) => taskWithFormattedId(t, config));
        console.log(formatJson({ tasks: out, count: out.length }));
      } else {
        console.log(formatTaskList(tasks, config));
      }
    });
  return cmd;
}
