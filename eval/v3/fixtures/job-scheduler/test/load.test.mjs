import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handlers } from '../src/jobs/index.mjs';
import { loadJobs } from '../src/load.mjs';
import { isKnownZone } from '../src/schedule/zone.mjs';
import { parseTime } from '../src/schedule/time.mjs';

const SEED = new URL('../data/jobs.json', import.meta.url).pathname;

test('the seed file lists valid jobs with a known handler', () => {
  const jobs = loadJobs(SEED);
  assert.ok(jobs.length >= 5);
  assert.equal(new Set(jobs.map((j) => j.id)).size, jobs.length);
  for (const job of jobs) {
    assert.ok(parseTime(job.time), `${job.id} has a valid time`);
    assert.ok(isKnownZone(job.zone), `${job.id} has a known zone`);
    assert.ok(handlers[job.task], `${job.id} has a handler`);
  }
});

test('a file that is not a list is rejected', () => {
  assert.throws(() => loadJobs(new URL('../package.json', import.meta.url).pathname), /list/);
});
