import { buildRoutes } from './api/index.mjs';
import { createRouter } from './http/router.mjs';
import { jobs } from './jobs/index.mjs';
import { createTermStore } from './store/terms.mjs';

export function createApp({ terms = [], clock = () => new Date() } = {}) {
  const context = { clock, store: createTermStore(terms) };
  context.runJob = (name, options = {}) => {
    if (!jobs[name]) throw new Error(`unknown job ${name}`);
    return jobs[name](context, options);
  };
  const router = createRouter(buildRoutes(context));
  return {
    handle: (request) => router.handle(request),
    runJob: context.runJob,
  };
}
