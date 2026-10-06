import { publish } from '../delivery/fanout.mjs';
import { notFound } from '../http/errors.mjs';
import { requireString } from '../lib/validate.mjs';

export const routes = (ctx) => [
  {
    method: 'POST', path: '/events',
    handle: async ({ body }) => {
      const event = ctx.events.add({ type: requireString(body.type, 'type'), data: body.data ?? {} });
      await publish(ctx, event);
      return { status: 201, body: event };
    },
  },
  {
    method: 'GET', path: '/events/:id',
    handle: ({ params }) => {
      const event = ctx.events.get(params.id);
      if (!event) throw notFound();
      return { status: 200, body: event };
    },
  },
];
