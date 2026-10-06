// Key-value store for checkout results.
export function createStore() {
  const map = new Map();
  return {
    has: (key) => map.has(key),
    get: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value);
    },
  };
}
