import { createWorker } from '../worker.mjs';

export const DEFAULT_CONFIG = 'config/worker.json';

// Builds a worker for a command. Each warning goes to stderr.
export function workerFor(configFile, { stderr, env, driver }) {
  return createWorker({ configFile, env, driver, warn: (message) => stderr.write(`warning: ${message}\n`) });
}
