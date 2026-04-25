import { Command } from 'commander';
import { parseTaskFile, serializeTaskFile } from '../core/parser.js';
import { applyDefaults, type TaskInput } from '../core/task.js';
import { nextId } from '../core/id.js';
import { readTasksFile, writeTasksFile, fileExists } from '../shared/file.js';
import { formatJson } from '../shared/output.js';
import { isValidField, normalizeField, isValidTransition, formatId } from '../core/config.js';

interface BatchAction {
  action: 'add' | 'update' | 'remove' | 'done' | 'start';
  id?: number;
  description?: string;
  priority?: string;
  scope?: string;
  type?: string;
  status?: string;
  note?: string;
  dependsOn?: string;
}

interface BatchResult {
  index: number;
  action: string;
  ok: boolean;
  id?: number;
  error?: string;
}

export function createBatchCommand(): Command {
  return new Command('batch')
    .description('Execute multiple task operations from JSON stdin')
    .option('--file <path>', 'Path to tasks file', 'TASKS.md')
    .action(async (opts) => {
      const filePath: string = opts.file;

      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk as Buffer);
      }
      const rawInput = Buffer.concat(chunks).toString('utf-8').trim();
      const actions: BatchAction[] = JSON.parse(rawInput);

      let content = '';
      if (await fileExists(filePath)) {
        content = await readTasksFile(filePath);
      }

      const taskFile = content ? parseTaskFile(content) : parseTaskFile('---\n---\n# Tasks\n');
      const config = taskFile.config;
      const results: BatchResult[] = [];

      for (const [i, act] of actions.entries()) {
        try {
          switch (act.action) {
            case 'add': {
              if (!act.description) throw new Error('description required');
              const taskInput: TaskInput = {
                description: act.description,
                priority: act.priority,
                scope: act.scope,
                type: act.type,
                status: act.status,
                depends: act.dependsOn,
              };
              const id = nextId(taskFile.tasks);
              const task = applyDefaults(taskInput, id, config);
              taskFile.tasks.push(task);
              results.push({ index: i, action: 'add', ok: true, id });
              break;
            }
            case 'update': {
              if (!act.id) throw new Error('id required');
              const task = taskFile.tasks.find((t) => t.id === act.id);
              if (!task) throw new Error(`Task ${formatId(act.id, config)} not found`);
              if (act.description) task.description = act.description;
              if (act.priority && isValidField(act.priority, config.fields.priority)) {
                task.priority = normalizeField(act.priority, config.fields.priority);
              }
              if (act.scope) {
                if (isValidField(act.scope, config.fields.scope)) {
                  task.scope = act.scope;
                }
              }
              if (act.type && isValidField(act.type, config.fields.type)) {
                task.type = normalizeField(act.type, config.fields.type);
              }
              if (act.status && isValidField(act.status, config.fields.status)) {
                if (!isValidTransition(task.status, act.status, config.transitions)) {
                  throw new Error(
                    `Cannot transition from "${task.status}" to "${act.status}"`,
                  );
                }
                task.status = normalizeField(act.status, config.fields.status);
              }
              if (act.note) task.extraLines.push(`> ${act.note}`);
              task.updated = new Date().toISOString().slice(0, 10);
              results.push({ index: i, action: 'update', ok: true, id: act.id });
              break;
            }
            case 'remove': {
              if (!act.id) throw new Error('id required');
              const idx = taskFile.tasks.findIndex((t) => t.id === act.id);
              if (idx === -1) throw new Error(`Task ${formatId(act.id, config)} not found`);
              taskFile.tasks.splice(idx, 1);
              results.push({ index: i, action: 'remove', ok: true, id: act.id });
              break;
            }
            case 'done': {
              if (!act.id) throw new Error('id required');
              const task = taskFile.tasks.find((t) => t.id === act.id);
              if (!task) throw new Error(`Task ${formatId(act.id, config)} not found`);
              if (!isValidTransition(task.status, 'done', config.transitions)) {
                throw new Error(
                  `Cannot transition from "${task.status}" to "done"`,
                );
              }
              task.status = 'done';
              task.updated = new Date().toISOString().slice(0, 10);
              results.push({ index: i, action: 'done', ok: true, id: act.id });
              break;
            }
            case 'start': {
              if (!act.id) throw new Error('id required');
              const task = taskFile.tasks.find((t) => t.id === act.id);
              if (!task) throw new Error(`Task ${formatId(act.id, config)} not found`);
              if (!isValidTransition(task.status, 'in-progress', config.transitions)) {
                throw new Error(
                  `Cannot transition from "${task.status}" to "in-progress"`,
                );
              }
              task.status = 'in-progress';
              task.updated = new Date().toISOString().slice(0, 10);
              results.push({ index: i, action: 'start', ok: true, id: act.id });
              break;
            }
            default:
              results.push({
                index: i,
                action: String(act.action),
                ok: false,
                error: `Unknown action: ${act.action}`,
              });
          }
        } catch (err) {
          results.push({
            index: i,
            action: act.action,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      await writeTasksFile(filePath, serializeTaskFile(taskFile));
      console.log(formatJson({ results }));
    });
}
