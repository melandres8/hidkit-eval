// In-memory event store. clock() returns the current time in milliseconds.
export function createStore() {
  return { events: [], nextId: 1 };
}

export function addEvent(store, event, clock) {
  const saved = { ...event, id: store.nextId++, createdAt: clock() };
  store.events.push(saved);
  return saved;
}

// Imports come from a CSV upload. Every event of the batch gets the time of the import.
export function importEvents(store, batch, clock) {
  const createdAt = clock();
  return batch.map((event) => {
    const saved = { ...event, id: store.nextId++, createdAt };
    store.events.push(saved);
    return saved;
  });
}
