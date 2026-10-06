import { buildRequest } from './request.mjs';

// Sends one delivery once and records the result.
export async function deliver(ctx, delivery) {
  const event = ctx.events.get(delivery.eventId);
  let status = 0;
  try {
    ({ status } = await ctx.transport.send(buildRequest(ctx, delivery, event)));
  } catch {
    status = 0;
  }
  const ok = status >= 200 && status < 300;
  return ctx.deliveries.update(delivery.id, {
    attempts: delivery.attempts + 1,
    lastStatus: status,
    status: ok ? 'delivered' : 'failed',
  });
}
