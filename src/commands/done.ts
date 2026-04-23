import { createStatusShortcut } from './status-shortcut.js';

export function createDoneCommand() {
  return createStatusShortcut('done', 'done');
}
