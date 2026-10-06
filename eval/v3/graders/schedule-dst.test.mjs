import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { runFrozenTests } from './lib/frozen.mjs';

const CHILD = fileURLToPath(new URL('./lib/schedule-child.mjs', import.meta.url));
const WINDOW_CHILD = fileURLToPath(new URL('./lib/schedule-window-child.mjs', import.meta.url));
const T = { timeout: 60_000 };
// The result must be the same for every process time zone.
const PROCESS_ZONES = ['UTC', 'America/New_York', 'Pacific/Auckland'];

const SPRING = [
  { name: 'new york, added days before', zone: 'America/New_York', time: '02:30', addAt: '2026-03-05T12:00:00Z', until: '2026-03-10T12:00:00Z',
    expected: ['2026-03-06T07:30:00.000Z', '2026-03-07T07:30:00.000Z', '2026-03-08T07:00:00.000Z', '2026-03-09T06:30:00.000Z', '2026-03-10T06:30:00.000Z'] },
  { name: 'new york, added the evening before', zone: 'America/New_York', time: '02:30', addAt: '2026-03-07T23:00:00Z', until: '2026-03-09T12:00:00Z',
    expected: ['2026-03-08T07:00:00.000Z', '2026-03-09T06:30:00.000Z'] },
  { name: 'berlin, added days before', zone: 'Europe/Berlin', time: '02:30', addAt: '2026-03-26T12:00:00Z', until: '2026-03-31T12:00:00Z',
    expected: ['2026-03-27T01:30:00.000Z', '2026-03-28T01:30:00.000Z', '2026-03-29T01:00:00.000Z', '2026-03-30T00:30:00.000Z', '2026-03-31T00:30:00.000Z'] },
  { name: 'sydney, added days before', zone: 'Australia/Sydney', time: '02:30', addAt: '2026-10-01T12:00:00Z', until: '2026-10-06T12:00:00Z',
    expected: ['2026-10-01T16:30:00.000Z', '2026-10-02T16:30:00.000Z', '2026-10-03T16:00:00.000Z', '2026-10-04T15:30:00.000Z', '2026-10-05T15:30:00.000Z'] },
  { name: 'sydney, added the evening before', zone: 'Australia/Sydney', time: '02:30', addAt: '2026-10-03T08:00:00Z', until: '2026-10-04T20:00:00Z',
    expected: ['2026-10-03T16:00:00.000Z', '2026-10-04T15:30:00.000Z'] },
];
const FALL = [
  { name: 'new york 01:30', zone: 'America/New_York', time: '01:30', addAt: '2026-10-30T12:00:00Z', until: '2026-11-03T12:00:00Z',
    expected: ['2026-10-31T05:30:00.000Z', '2026-11-01T05:30:00.000Z', '2026-11-02T06:30:00.000Z', '2026-11-03T06:30:00.000Z'] },
  { name: 'new york 00:30, once for each calendar day', zone: 'America/New_York', time: '00:30', addAt: '2026-10-30T12:00:00Z', until: '2026-11-03T12:00:00Z',
    expected: ['2026-10-31T04:30:00.000Z', '2026-11-01T04:30:00.000Z', '2026-11-02T05:30:00.000Z', '2026-11-03T05:30:00.000Z'] },
  { name: 'new york 01:30, added the evening before', zone: 'America/New_York', time: '01:30', addAt: '2026-11-01T00:00:00Z', until: '2026-11-02T12:00:00Z',
    expected: ['2026-11-01T05:30:00.000Z', '2026-11-02T06:30:00.000Z'] },
  { name: 'berlin', zone: 'Europe/Berlin', time: '02:30', addAt: '2026-10-22T12:00:00Z', until: '2026-10-27T12:00:00Z',
    expected: ['2026-10-23T00:30:00.000Z', '2026-10-24T00:30:00.000Z', '2026-10-25T00:30:00.000Z', '2026-10-26T01:30:00.000Z', '2026-10-27T01:30:00.000Z'] },
  { name: 'sydney', zone: 'Australia/Sydney', time: '02:30', addAt: '2026-04-02T12:00:00Z', until: '2026-04-07T12:00:00Z',
    expected: ['2026-04-02T15:30:00.000Z', '2026-04-03T15:30:00.000Z', '2026-04-04T15:30:00.000Z', '2026-04-05T16:30:00.000Z', '2026-04-06T16:30:00.000Z'] },
];
const UTC = [
  { name: 'utc 02:30 in spring', zone: 'UTC', time: '02:30', addAt: '2026-03-05T12:00:00Z', until: '2026-03-10T12:00:00Z',
    expected: ['2026-03-06T02:30:00.000Z', '2026-03-07T02:30:00.000Z', '2026-03-08T02:30:00.000Z', '2026-03-09T02:30:00.000Z', '2026-03-10T02:30:00.000Z'] },
  { name: 'utc 23:30 in autumn', zone: 'UTC', time: '23:30', addAt: '2026-10-30T12:00:00Z', until: '2026-11-03T12:00:00Z',
    expected: ['2026-10-30T23:30:00.000Z', '2026-10-31T23:30:00.000Z', '2026-11-01T23:30:00.000Z', '2026-11-02T23:30:00.000Z'] },
  { name: 'etc/utc 00:15', zone: 'Etc/UTC', time: '00:15', addAt: '2026-03-27T12:00:00Z', until: '2026-03-30T12:00:00Z',
    expected: ['2026-03-28T00:15:00.000Z', '2026-03-29T00:15:00.000Z', '2026-03-30T00:15:00.000Z'] },
];

// The task sync-ledger records the calendar day that ended before the run, in the zone of the job (docs/jobs.md).
const w = (from, to) => ({ from, to });
const WINDOWS = [
  { name: 'new york, spring', zone: 'America/New_York', time: '07:00', addAt: '2026-03-07T00:00:00Z', until: '2026-03-09T23:00:00Z',
    expected: [w('2026-03-06T05:00:00.000Z', '2026-03-07T05:00:00.000Z'), w('2026-03-07T05:00:00.000Z', '2026-03-08T05:00:00.000Z'), w('2026-03-08T05:00:00.000Z', '2026-03-09T04:00:00.000Z')] },
  { name: 'new york, fall', zone: 'America/New_York', time: '07:00', addAt: '2026-10-31T00:00:00Z', until: '2026-11-02T23:00:00Z',
    expected: [w('2026-10-30T04:00:00.000Z', '2026-10-31T04:00:00.000Z'), w('2026-10-31T04:00:00.000Z', '2026-11-01T04:00:00.000Z'), w('2026-11-01T04:00:00.000Z', '2026-11-02T05:00:00.000Z')] },
  { name: 'sydney, spring', zone: 'Australia/Sydney', time: '07:00', addAt: '2026-10-03T00:00:00Z', until: '2026-10-04T23:00:00Z',
    expected: [w('2026-10-02T14:00:00.000Z', '2026-10-03T14:00:00.000Z'), w('2026-10-03T14:00:00.000Z', '2026-10-04T13:00:00.000Z')] },
];
const WINDOWS_UTC = [
  { name: 'utc', zone: 'UTC', time: '07:00', addAt: '2026-03-07T00:00:00Z', until: '2026-03-09T12:00:00Z',
    expected: [w('2026-03-06T00:00:00.000Z', '2026-03-07T00:00:00.000Z'), w('2026-03-07T00:00:00.000Z', '2026-03-08T00:00:00.000Z'), w('2026-03-08T00:00:00.000Z', '2026-03-09T00:00:00.000Z')] },
];

const cases = [...SPRING, ...FALL, ...UTC].map(({ expected, ...rest }) => rest);
const { NODE_TEST_CONTEXT, ...baseEnv } = process.env;

// One child process for each process time zone. The candidate must not depend on TZ.
const results = {};
assert.equal(new Set(cases.map((c) => c.name)).size, cases.length, 'case names are unique');
for (const tz of PROCESS_ZONES) {
  const res = spawnSync(process.execPath, [CHILD, process.env.CANDIDATE_DIR, JSON.stringify(cases)], {
    encoding: 'utf8', env: { ...baseEnv, TZ: tz }, timeout: 40_000, killSignal: 'SIGKILL',
  });
  try {
    results[tz] = JSON.parse(res.stdout);
  } catch {
    results[tz] = { failure: `the scheduler did not run with TZ=${tz}: ${res.error?.message ?? res.stderr.slice(0, 300)}` };
  }
}

const windowResults = {};
for (const tz of PROCESS_ZONES) {
  const res = spawnSync(process.execPath, [WINDOW_CHILD, process.env.CANDIDATE_DIR, JSON.stringify([...WINDOWS, ...WINDOWS_UTC].map(({ expected, ...rest }) => rest))], {
    encoding: 'utf8', env: { ...baseEnv, TZ: tz }, timeout: 40_000, killSignal: 'SIGKILL',
  });
  try {
    windowResults[tz] = JSON.parse(res.stdout);
  } catch {
    windowResults[tz] = { failure: `the window run failed with TZ=${tz}: ${res.error?.message ?? res.stderr.slice(0, 300)}` };
  }
}

function checkWindows(group) {
  for (const tz of PROCESS_ZONES) {
    assert.ok(!windowResults[tz].failure, windowResults[tz].failure);
    for (const c of group) {
      const got = windowResults[tz][c.name];
      assert.equal(got.error, null, `${c.name} with TZ=${tz}: ${got.error}`);
      assert.deepEqual(got.windows, c.expected, `${c.name} with TZ=${tz}`);
    }
  }
}

function check(group) {
  for (const tz of PROCESS_ZONES) {
    assert.ok(!results[tz].failure, results[tz].failure);
    for (const c of group) {
      const got = results[tz][c.name];
      assert.equal(got.error, null, `${c.name} with TZ=${tz}: ${got.error}`);
      assert.deepEqual(got.runs, c.expected, `${c.name} with TZ=${tz}`);
    }
  }
}

test('a job in the spring-forward gap runs once, at the first valid time after the gap', T, () => check(SPRING));
test('a job in the fall-back repeat runs once, at the first of the two times', T, () => check(FALL));
test('a job in UTC does not move', T, () => check(UTC));

test('the sync-ledger window is the calendar day of the job zone', T, () => checkWindows(WINDOWS));
test('the sync-ledger window of a job in UTC is the UTC day', T, () => checkWindows(WINDOWS_UTC));

test('the original tests still pass', T, () => {
  const res = runFrozenTests('job-scheduler');
  assert.ok(res.ok, res.output);
});
