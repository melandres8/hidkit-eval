import { configCommand } from './config.mjs';
import { migrateCommand } from './migrate.mjs';
import { start } from './start.mjs';
import { version } from './version.mjs';

// The command table. A command takes (args, io) and returns the exit code.
export const commands = { start, migrate: migrateCommand, config: configCommand, version };
