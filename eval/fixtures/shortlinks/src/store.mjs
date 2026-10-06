export function createStore(now = () => Date.now()) {
  const links = new Map();
  return {
    create(code, url) {
      if (links.has(code)) throw new Error('code already exists');
      links.set(code, { url, createdAt: now() });
    },
    resolve(code) {
      return links.get(code)?.url ?? null;
    },
  };
}
