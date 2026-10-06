export function createDeliveryStore({ ids, clock }) {
  const deliveries = new Map();
  return {
    add({ eventId, subscription }) {
      const delivery = {
        id: ids.next('dlv'), eventId, subscriptionId: subscription.id, url: subscription.url,
        status: 'pending', attempts: 0, lastStatus: null, createdAt: clock().toISOString(),
      };
      deliveries.set(delivery.id, delivery);
      return delivery;
    },
    get: (id) => deliveries.get(id) ?? null,
    update(id, changes) {
      const delivery = { ...deliveries.get(id), ...changes };
      deliveries.set(id, delivery);
      return delivery;
    },
    list: () => [...deliveries.values()],
  };
}
