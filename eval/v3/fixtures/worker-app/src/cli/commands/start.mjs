import { parseArgs } from 'node:util';
import { DEFAULT_CONFIG, workerFor } from '../context.mjs';

export function start(args, io) {
  const { values } = parseArgs({ args, options: { config: { type: 'string', default: DEFAULT_CONFIG } } });
  const worker = workerFor(values.config, io);
  worker.connect();
  io.stdout.write(`worker started on queue ${worker.queue.name}\n`);
  return 0;
}
