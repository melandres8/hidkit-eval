import { parseArgs } from 'node:util';
import { DEFAULT_CONFIG, workerFor } from '../context.mjs';

export function migrateCommand(args, io) {
  const { values } = parseArgs({ args, options: { config: { type: 'string', default: DEFAULT_CONFIG } } });
  const result = workerFor(values.config, io).migrate();
  io.stdout.write(`migrating ${result.target}\n`);
  for (const name of result.applied) io.stdout.write(`applied ${name}\n`);
  return 0;
}
