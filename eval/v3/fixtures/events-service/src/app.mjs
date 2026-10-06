import { buildRoutes } from './api/index.mjs';
import { createRouter } from './http/router.mjs';
import { jobs } from './jobs/index.mjs';
import { createIds } from './lib/ids.mjs';
import { createDeliveryStore } from './store/deliveries.mjs';
import { createEventStore } from './store/events.mjs';
import { createSubscriptionStore } from './store/subscriptions.mjs';

export function createApp({ clock = () => new Date(), transport = { send: async () => ({ status: 200 }) } } = {}) {
  const ids = createIds();
  const ctx = {
    clock,
    transport,
    ids,
    events: createEventStore({ ids, clock }),
    subscriptions: createSubscriptionStore({ ids }),
    deliveries: createDeliveryStore({ ids, clock }),
  };
  const router = createRouter(buildRoutes(ctx));
  return {
    ...ctx,
    handle: (request) => router.handle(request),
    runJob(name) {
      if (!jobs[name]) throw new Error(`unknown job ${name}`);
      return jobs[name](ctx);
    },
  };
}
