import { buildRoutes } from './api/index.mjs';
import { createRouter } from './http/router.mjs';
import { jobs } from './jobs/index.mjs';
import { createTalkStore } from './talks/store.mjs';

export function createApp({ clock = () => new Date() } = {}) {
  const context = { clock, talks: createTalkStore({ clock }) };
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
