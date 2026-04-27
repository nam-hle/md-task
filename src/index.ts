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
import { loadCliConfig } from './shared/cli-config.js';

async function main(): Promise<void> {
  const config = await loadCliConfig();

  const program = new Command();
  program.name('md-task').description('CLI for managing tasks as markdown').version('0.1.0');

  program.addCommand(createAddCommand(config));
  program.addCommand(createListCommand(config));
  program.addCommand(createUpdateCommand(config));
  program.addCommand(createRemoveCommand());
  program.addCommand(createViewCommand());
  program.addCommand(createInitCommand());
  program.addCommand(createNextCommand(config));
  program.addCommand(createSearchCommand());
  program.addCommand(createStatsCommand());
  program.addCommand(createBatchCommand());
  program.addCommand(createMoveCommand(config));
  program.addCommand(createFormatCommand());

  await program.parseAsync(process.argv);
}

main().catch((err: unknown) => {
  if (err instanceof MdTaskError) {
    console.error(err.message);
    process.exitCode = err.exitCode;
  } else {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
});
