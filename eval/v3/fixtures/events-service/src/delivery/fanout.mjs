import { deliver } from './send.mjs';

// Creates a delivery for each matching subscription and makes the first attempt.
export async function publish(ctx, event) {
  const subscriptions = ctx.subscriptions.matching(event.type);
  const deliveries = subscriptions.map((subscription) => ctx.deliveries.add({ eventId: event.id, subscription }));
  for (const delivery of deliveries) await deliver(ctx, delivery);
  return deliveries.map((d) => d.id);
}
