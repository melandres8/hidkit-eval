// Newest first. The cursor is the createdAt of the last item of the previous page.
export function listFeed(store, { cursor, limit = 20 } = {}) {
  const sorted = [...store.events].sort((a, b) => b.createdAt - a.createdAt);
  const rest = cursor === undefined ? sorted : sorted.filter((e) => e.createdAt < cursor);
  const items = rest.slice(0, limit);
  const nextCursor = rest.length > limit ? items[items.length - 1].createdAt : null;
  return { items, nextCursor };
}
