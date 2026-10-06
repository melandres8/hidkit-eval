import { parseTime } from './time.mjs';
import { localParts, offsetAt } from './zone.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;

// The first run of a new job: today at the local time, or tomorrow when that time has passed.
export function firstRun(job, now) {
  const { hour, minute } = parseTime(job.time);
  const local = localParts(now, job.zone);
  const candidate = Date.UTC(local.year, local.month - 1, local.day, hour, minute) - offsetAt(now, job.zone);
  return candidate > now ? candidate : candidate + DAY_MS;
}

// The run that follows a run that was planned for scheduledAt.
export function nextRun(job, scheduledAt) {
  return scheduledAt + DAY_MS;
}
