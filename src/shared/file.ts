import { readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

export async function readTasksFile(path: string): Promise<string> {
  return readFile(path, 'utf-8');
}

export async function writeTasksFile(path: string, content: string): Promise<void> {
  await writeFile(path, content, 'utf-8');
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
