import { buildRoutes } from './api/index.mjs';
import { createStore } from './db/store.mjs';
import { createRouter } from './http/router.mjs';
import { jobs } from './jobs/index.mjs';

export function createApp() {
  const context = { store: createStore() };
  const router = createRouter(buildRoutes(context));
  return {
    handle: (request) => router.handle(request),
    runJob(name, options = {}) {
      if (!jobs[name]) throw new Error(`unknown job ${name}`);
      return jobs[name](context, options);
    },
  };
}
