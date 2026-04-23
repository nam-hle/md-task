import { createStatusShortcut } from './status-shortcut.js';

export function createStartCommand() {
  return createStatusShortcut('start', 'in-progress');
}
