import { Command } from 'commander';
import { parseTaskFile, serializeTaskFile } from '../core/parser.js';
import { applyDefaults, type TaskInput } from '../core/task.js';
import { nextId } from '../core/id.js';
import { readTasksFile, writeTasksFile, fileExists } from '../shared/file.js';
import { formatJson, formatTaskDetail } from '../shared/output.js';
import { validationError } from '../shared/errors.js';

const EMPTY_FILE = '# Tasks\n';

export function createAddCommand(): Command {
  return new Command('add')
    .description('Add a new task')
    .argument('<description>', 'Task description')
    .option('--priority <value>', 'Priority: critical/high/medium/low', 'medium')
    .option('--scope <value>', 'Scope label', 'general')
    .option('--type <value>', 'Type: feature/bug/task/chore', 'task')
    .option('--status <value>', 'Status: todo/in-progress/done/cancelled', 'todo')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .option('--format <type>', 'Output format: text/json', 'text')
    .action(async (description: string, opts) => {
      const filePath: string = opts.file;
      const format: string = opts.format;

      if (!description.trim()) {
        throw validationError('Description cannot be empty');
      }

      let content = EMPTY_FILE;
      if (await fileExists(filePath)) {
        content = await readTasksFile(filePath);
      }

      const taskFile = parseTaskFile(content);

      for (const warning of taskFile.warnings) {
        console.error(`warning: ${warning}`);
      }

      const input: TaskInput = {
        description: description.trim(),
        priority: opts.priority,
        scope: opts.scope,
        type: opts.type,
        status: opts.status,
      };

      const id = nextId(taskFile.tasks);
      const task = applyDefaults(input, id);
      taskFile.tasks.push(task);

      await writeTasksFile(filePath, serializeTaskFile(taskFile));

      if (format === 'json') {
        console.log(formatJson({ task }));
      } else {
        console.log(`Created task ${task.id}: ${task.description}`);
      }
    });
}
