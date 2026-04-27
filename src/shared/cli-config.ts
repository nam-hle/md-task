import { parseTaskFile } from '../core/parser.js';
import { DEFAULT_CONFIG, type TaskConfig } from '../core/config.js';
import { readTasksFile, fileExists } from './file.js';

export function resolveFilePath(argv: string[]): string {
  const idx = argv.indexOf('--file');
  if (idx >= 0 && idx + 1 < argv.length) {
    const next = argv[idx + 1];
    if (next) return next;
  }
  return 'TASKS.md';
}

export async function loadCliConfig(argv: string[] = process.argv): Promise<TaskConfig> {
  const path = resolveFilePath(argv);
  try {
    if (!(await fileExists(path))) return { ...DEFAULT_CONFIG };
    const content = await readTasksFile(path);
    return parseTaskFile(content).config;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function valuesHelp(values: string[] | null): string {
  if (!values || values.length === 0) return '';
  return values.join('|');
}
