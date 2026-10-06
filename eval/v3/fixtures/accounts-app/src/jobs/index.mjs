import { runDigest } from './nightly-digest.mjs';
import { runTeamReport } from './team-report.mjs';

// Add a job to this table to make it runnable by name.
const jobs = { digest: runDigest, 'team-report': runTeamReport };

export const jobNames = Object.keys(jobs);

export function runJob(name, context) {
  const job = jobs[name];
  if (!job) throw new Error(`unknown job ${name}`);
  return job(context);
}
