import { runSettlement } from './settlement.mjs';

// Add a job to this table to make it runnable by name.
const jobs = { settlement: runSettlement };

export const jobNames = Object.keys(jobs);

export function runJob(name, ctx) {
  const job = jobs[name];
  if (!job) throw new Error(`unknown job ${name}`);
  return job(ctx);
}
