export function createSubscriptionStore({ ids }) {
  const subscriptions = new Map();
  return {
    add({ url, types = [] }) {
      const subscription = { id: ids.next('sub'), url, types };
      subscriptions.set(subscription.id, subscription);
      return subscription;
    },
    get: (id) => subscriptions.get(id) ?? null,
    list: () => [...subscriptions.values()],
    remove: (id) => subscriptions.delete(id),
    matching: (type) => [...subscriptions.values()].filter((s) => s.types.length === 0 || s.types.includes(type)),
  };
}
