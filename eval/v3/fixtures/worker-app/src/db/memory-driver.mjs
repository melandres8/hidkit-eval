// A driver that keeps everything in memory. The worker uses it when no driver is given.
export function createMemoryDriver() {
  const applied = new Set();
  const migrations = ['001-create-jobs', '002-add-job-attempts'];
  return {
    connect: (url) => ({ url, close() {} }),
    migrate() {
      const fresh = migrations.filter((name) => !applied.has(name));
      fresh.forEach((name) => applied.add(name));
      return fresh;
    },
  };
}
