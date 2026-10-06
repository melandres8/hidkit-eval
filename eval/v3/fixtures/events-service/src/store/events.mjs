export function createEventStore({ ids, clock }) {
  const events = new Map();
  return {
    add({ type, data }) {
      const event = { id: ids.next('evt'), type, data, createdAt: clock().toISOString() };
      events.set(event.id, event);
      return event;
    },
    get: (id) => events.get(id) ?? null,
    removeBefore(cutoff) {
      let removed = 0;
      for (const [id, event] of events) {
        if (new Date(event.createdAt) < cutoff) {
          events.delete(id);
          removed += 1;
        }
      }
      return removed;
    },
  };
}
