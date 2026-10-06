import { buildRoutes } from './api/index.mjs';
import { createStore } from './catalog/store.mjs';
import { createRouter } from './http/router.mjs';
import { jobs } from './jobs/index.mjs';

export function createApp({ stored = [], clock = () => new Date() } = {}) {
  const context = { store: createStore(stored), clock };
  const router = createRouter(buildRoutes(context));
  return {
    handle: (request) => router.handle(request),
    snapshot: () => context.store.snapshot(),
    runJob(name, options = {}) {
      if (!jobs[name]) throw new Error(`unknown job ${name}`);
      return jobs[name](context, options);
    },
  };
}
