import { Command } from 'commander';
import { createAddCommand } from './commands/add.js';
import { createListCommand } from './commands/list.js';
import { createUpdateCommand } from './commands/update.js';
import { createRemoveCommand } from './commands/remove.js';
import { createViewCommand } from './commands/view.js';
import { createInitCommand } from './commands/init.js';
import { createNextCommand } from './commands/next.js';
import { createSearchCommand } from './commands/search.js';
import { createStatsCommand } from './commands/stats.js';
import { createBatchCommand } from './commands/batch.js';
import { createMoveCommand } from './commands/move.js';
import { createFormatCommand } from './commands/format.js';
import { MdTaskError } from './shared/errors.js';

const program = new Command();

program.name('md-task').description('CLI for managing tasks as markdown').version('0.1.0');

program.addCommand(createAddCommand());
program.addCommand(createListCommand());
program.addCommand(createUpdateCommand());
program.addCommand(createRemoveCommand());
program.addCommand(createViewCommand());
program.addCommand(createInitCommand());
program.addCommand(createNextCommand());
program.addCommand(createSearchCommand());
program.addCommand(createStatsCommand());
program.addCommand(createBatchCommand());
program.addCommand(createMoveCommand());
program.addCommand(createFormatCommand());

program.parseAsync(process.argv).catch((err: unknown) => {
  if (err instanceof MdTaskError) {
    console.error(err.message);
    process.exitCode = err.exitCode;
  } else {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
});
