import { deliver } from '../delivery/send.mjs';
import { notFound } from '../http/errors.mjs';
import { requireUrl } from '../lib/validate.mjs';

export const routes = (ctx) => [
  {
    method: 'POST', path: '/subscriptions',
    handle: ({ body }) => {
      const types = Array.isArray(body.types) ? body.types.filter((t) => typeof t === 'string') : [];
      return { status: 201, body: ctx.subscriptions.add({ url: requireUrl(body.url), types }) };
    },
  },
  { method: 'GET', path: '/subscriptions', handle: () => ({ status: 200, body: ctx.subscriptions.list() }) },
  {
    method: 'DELETE', path: '/subscriptions/:id',
    handle: ({ params }) => {
      if (!ctx.subscriptions.remove(params.id)) throw notFound();
      return { status: 204, body: null };
    },
  },
  {
    method: 'POST', path: '/subscriptions/:id/test',
    handle: async ({ params }) => {
      const subscription = ctx.subscriptions.get(params.id);
      if (!subscription) throw notFound();
      const event = ctx.events.add({ type: 'ping', data: {} });
      const delivery = ctx.deliveries.add({ eventId: event.id, subscription });
      return { status: 200, body: await deliver(ctx, delivery) };
    },
  },
];
