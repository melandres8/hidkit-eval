// Handles that start with the text the person typed after "@".
export function suggestHandles(store, prefix, limit = 5) {
  const needle = String(prefix ?? '').toLowerCase();
  return store.all()
    .filter((user) => user.handle.toLowerCase().startsWith(needle))
    .slice(0, limit)
    .map((user) => ({ id: user.id, handle: user.handle }));
}
