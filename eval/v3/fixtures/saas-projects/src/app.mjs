import { buildRoutes } from './api/index.mjs';
import { createDb } from './db/index.mjs';
import { createRouter } from './http/router.mjs';
import { jobs } from './jobs/index.mjs';
import { createIds } from './lib/ids.mjs';

export function createApp({ clock = () => new Date() } = {}) {
  const context = { db: createDb(), id: createIds(), clock };
  const router = createRouter(buildRoutes(context));
  return {
    handle: (request) => router.handle(request),
    runJob(name, options = {}) {
      if (!jobs[name]) throw new Error(`unknown job ${name}`);
      return jobs[name](context, options);
    },
  };
}
