import fs from 'node:fs';

// Reads a list of jobs from a JSON file.
export function loadJobs(file) {
  const jobs = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(jobs)) throw new Error('the job file must hold a list');
  return jobs;
}
