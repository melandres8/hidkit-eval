import { handlers } from './jobs/index.mjs';
import { firstRun, nextRun } from './schedule/next-run.mjs';
import { createJobStore } from './store/jobs.mjs';

const runHandler = (job, scheduledAt) => handlers[job.task]?.(job, scheduledAt);

export function createScheduler({ clock = () => new Date(), onRun = runHandler } = {}) {
  const store = createJobStore();
  const view = (job) => ({ ...job, nextRunAt: new Date(job.nextRunAt) });
  return {
    add(job) {
      const stored = store.add(job);
      stored.nextRunAt = firstRun(stored, clock().getTime());
      return view(stored);
    },
    remove: (id) => store.remove(id),
    nextRunAt: (id) => (store.get(id) ? new Date(store.get(id).nextRunAt) : null),
    list: () => store.list().map(view),
    tick() {
      const now = clock().getTime();
      for (const job of store.list()) {
        while (job.nextRunAt <= now) {
          const scheduledAt = job.nextRunAt;
          job.nextRunAt = nextRun(job, scheduledAt);
          onRun(view({ ...job, nextRunAt: scheduledAt }), new Date(scheduledAt));
        }
      }
    },
  };
}
