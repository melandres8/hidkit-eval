import { createScheduler } from '../src/scheduler.mjs';

// A scheduler with a clock that tests move by hand. Each run goes to `runs`.
export function makeScheduler(start) {
  const clock = { now: Date.parse(start) };
  const runs = [];
  const scheduler = createScheduler({ clock: () => new Date(clock.now), onRun: (job, at) => runs.push({ id: job.id, at: at.toISOString() }) });
  return { scheduler, clock, runs, advanceTo: (iso) => { clock.now = Date.parse(iso); scheduler.tick(); } };
}
