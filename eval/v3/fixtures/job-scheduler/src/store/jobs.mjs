import { parseTime } from '../schedule/time.mjs';
import { isKnownZone } from '../schedule/zone.mjs';

export function createJobStore() {
  const jobs = new Map();
  return {
    add(job) {
      if (jobs.has(job.id)) throw new Error(`job ${job.id} exists`);
      if (!parseTime(job.time)) throw new Error(`time ${job.time} is not valid`);
      if (!isKnownZone(job.zone)) throw new Error(`zone ${job.zone} is not known`);
      jobs.set(job.id, { ...job });
      return jobs.get(job.id);
    },
    get: (id) => jobs.get(id) ?? null,
    remove: (id) => jobs.delete(id),
    list: () => [...jobs.values()],
  };
}
