export function createQueue(config) {
  const jobs = [];
  return {
    name: config.queue.name,
    pollIntervalMs: config.queue.pollIntervalMs,
    enqueue: (job) => jobs.push(job),
    take: () => jobs.shift() ?? null,
    size: () => jobs.length,
  };
}
