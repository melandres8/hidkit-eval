// A fixed-window counter. check(key) counts one request for the key.
export function createLimiter({ max, windowSeconds, clock }) {
  const windows = new Map();
  return {
    check(key) {
      const now = clock().getTime();
      let entry = windows.get(key);
      if (!entry || now - entry.start >= windowSeconds * 1000) {
        entry = { start: now, count: 0 };
        windows.set(key, entry);
      }
      entry.count += 1;
      const retryAfter = Math.ceil((entry.start + windowSeconds * 1000 - now) / 1000);
      return { allowed: entry.count <= max, remaining: Math.max(0, max - entry.count), retryAfter };
    },
  };
}
