import type { Task, TaskFile } from './task.js';
import {
  type TaskConfig,
  DEFAULT_CONFIG,
  parseConfig,
  validateConfig,
  formatId,
  parseIdFromHeading,
  isValidField,
  serializeConfig,
} from './config.js';

const TAG_RE = /^(\w[\w-]*):(.*)/;

interface RawBlock {
  id: number;
  lines: string[];
}

function extractFrontmatter(content: string): { yaml: string; body: string } {
  if (!content.startsWith('---')) {
    return { yaml: '', body: content };
  }

  const endIndex = content.indexOf('\n---', 3);
  if (endIndex === -1) {
    return { yaml: '', body: content };
  }

  const yaml = content.slice(4, endIndex);
  const body = content.slice(endIndex + 4);
  return { yaml, body };
}

function parseTagLine(line: string): Map<string, string> {
  const tags = new Map<string, string>();
  const parts = line.split(/, (?=\w[\w-]*:)/);
  for (const part of parts) {
    const trimmed = part.trim();
    const match = TAG_RE.exec(trimmed);
    if (match?.[1] && match[2] !== undefined) {
      tags.set(match[1].toLowerCase(), match[2].trim());
    }
  }
  return tags;
}

function blockToTask(block: RawBlock, config: TaskConfig, warnings: string[]): Task | null {
  const { id, lines } = block;

  if (lines.length === 0) {
    warnings.push(`${formatId(id, config)}: empty block, skipping`);
    return null;
  }

  let description = '';
  const tagMap = new Map<string, string>();
  const extraLines: string[] = [];
  let descriptionFound = false;

  const knownTags = ['type', 'priority', 'scope', 'status', 'created', 'updated', 'depends'];

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const potentialTags = parseTagLine(line);
    const hasKnownTag = [...potentialTags.keys()].some((k) => knownTags.includes(k));

    if (hasKnownTag && potentialTags.size > 0) {
      for (const [key, value] of potentialTags) {
        tagMap.set(key, value);
      }
    } else if (!descriptionFound) {
      description = line.trim();
      descriptionFound = true;
    } else {
      extraLines.push(line);
    }
  }

  if (!description && tagMap.has('description')) {
    description = tagMap.get('description') ?? '';
    tagMap.delete('description');
  }

  if (!description) {
    warnings.push(`${formatId(id, config)}: no description found, skipping`);
    return null;
  }

  const priorityRaw = tagMap.get('priority') ?? '';
  const typeRaw = tagMap.get('type') ?? '';
  const statusRaw = tagMap.get('status') ?? '';
  const scopeRaw = tagMap.get('scope') ?? '';
  const dependsStr = tagMap.get('depends') ?? '';

  return {
    id,
    description,
    priority: isValidField(priorityRaw, config.fields.priority)
      ? priorityRaw.toLowerCase()
      : config.defaults.priority,
    scope: scopeRaw
      ? isValidField(scopeRaw, config.fields.scope)
        ? scopeRaw
        : config.defaults.scope
      : config.defaults.scope,
    type: isValidField(typeRaw, config.fields.type) ? typeRaw.toLowerCase() : config.defaults.type,
    status: isValidField(statusRaw, config.fields.status)
      ? statusRaw.toLowerCase()
      : config.defaults.status,
    created: tagMap.get('created') ?? new Date().toISOString().slice(0, 10),
    updated:
      tagMap.get('updated') ?? tagMap.get('created') ?? new Date().toISOString().slice(0, 10),
    depends: dependsStr
      ? dependsStr
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n))
      : [],
    extraLines,
  };
}

export function parseTaskFile(content: string): TaskFile {
  const { yaml, body } = extractFrontmatter(content);
  const config = yaml ? parseConfig(yaml) : { ...DEFAULT_CONFIG };

  const configErrors = validateConfig(config);
  const warnings: string[] = [];
  for (const err of configErrors) {
    warnings.push(`config: ${err}`);
  }

  const lines = body.split('\n');
  const header: string[] = [];
  const blocks: RawBlock[] = [];

  let currentBlock: RawBlock | null = null;

  for (const line of lines) {
    const id = parseIdFromHeading(line, config);

    if (id !== null) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = { id, lines: [] };
    } else if (currentBlock) {
      currentBlock.lines.push(line);
    } else {
      header.push(line);
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  const tasks: Task[] = [];
  for (const block of blocks) {
    const task = blockToTask(block, config, warnings);
    if (task) {
      tasks.push(task);
    }
  }

  return { config, header, tasks, warnings };
}

function taskToBlock(task: Task, config: TaskConfig): string {
  const lines: string[] = [];
  lines.push(`### ${formatId(task.id, config)}`);
  const tags: string[] = [];
  for (const f of config.fieldOrder) {
    tags.push(`${f}:${task[f]}`);
  }
  tags.push(`created:${task.created}`);
  tags.push(`updated:${task.updated}`);
  if (task.depends.length > 0) {
    tags.push(`depends:${task.depends.join(',')}`);
  }
  lines.push(tags.join(', '));
  lines.push(task.description);
  for (const extra of task.extraLines) {
    lines.push(extra);
  }
  return lines.join('\n');
}

export function serializeTaskFile(taskFile: TaskFile): string {
  const parts: string[] = [];

  parts.push(serializeConfig(taskFile.config));

  const trimmedHeader = trimBlankBoundaries(taskFile.header);
  if (trimmedHeader.length > 0) {
    parts.push(trimmedHeader.join('\n'));
  }

  for (const task of taskFile.tasks) {
    parts.push(taskToBlock(task, taskFile.config));
  }

  let result = parts.join('\n\n');
  if (!result.endsWith('\n')) {
    result += '\n';
  }
  return result;
}

function trimBlankBoundaries(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start]!.trim() === '') start++;
  while (end > start && lines[end - 1]!.trim() === '') end--;
  return lines.slice(start, end);
}
