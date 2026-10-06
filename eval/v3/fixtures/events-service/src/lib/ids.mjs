// A counter for each prefix, so ids are easy to read in logs and tests.
export function createIds() {
  const counters = new Map();
  return {
    next(prefix) {
      const n = (counters.get(prefix) ?? 0) + 1;
      counters.set(prefix, n);
      return `${prefix}_${n}`;
    },
  };
}
