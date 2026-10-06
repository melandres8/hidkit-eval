import { loadConfig } from './config/load.mjs';
import { connect } from './db/connect.mjs';
import { createMemoryDriver } from './db/memory-driver.mjs';
import { migrate } from './db/migrate.mjs';
import { createQueue } from './queue/queue.mjs';

export function createWorker({ configFile, env = process.env, driver = createMemoryDriver(), warn = () => {} }) {
  const config = loadConfig(configFile, { env, warn });
  return {
    config,
    queue: createQueue(config),
    connect: () => connect(config, driver),
    migrate: () => migrate(config, driver),
  };
}
