// Keeps one entry per user. The index builds again each time the store changes.
export function createSearchIndex(store) {
  let entries = [];
  const build = () => {
    entries = store.all().map((user) => ({ user, text: `${user.name} ${user.handle} ${user.email}`.toLowerCase() }));
  };
  build();
  store.subscribe(build);
  return {
    search(query, limit = 20) {
      const needle = String(query ?? '').trim().toLowerCase();
      if (!needle) return [];
      return entries.filter((entry) => entry.text.includes(needle)).slice(0, limit).map(({ user }) => ({ id: user.id, name: user.name, handle: user.handle }));
    },
  };
}
