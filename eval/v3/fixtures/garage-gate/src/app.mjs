import { buildRoutes } from './api/index.mjs';
import { createRouter } from './http/router.mjs';
import { jobs } from './jobs/index.mjs';
import { createEntryLog } from './log/entries.mjs';
import { createPassStore } from './passes/store.mjs';

export function createApp({ passes = [], clock = () => new Date() } = {}) {
  const context = { clock, passes: createPassStore(passes), log: createEntryLog({ clock }) };
  const router = createRouter(buildRoutes(context));
  return {
    handle: (request) => router.handle(request),
    runJob(name, options = {}) {
      if (!jobs[name]) throw new Error(`unknown job ${name}`);
      return jobs[name](context, options);
    },
  };
}
