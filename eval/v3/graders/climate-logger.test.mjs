import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);
const T = { timeout: 20_000 };

function makeApp() {
  const app = createApp();
  const call = (method, path, body, query) => app.handle({ method, path, body, query });
  const read = (sensor, at, value) => {
    const res = call('POST', '/readings', { sensor, at, value });
    assert.equal(res.status, 201, `could not store ${value}`);
    return res.body;
  };
  const day = (sensor, date) => call('GET', `/sensors/${sensor}/day`, undefined, { date }).body;
  const week = (sensor, from) => call('GET', `/sensors/${sensor}/week`, undefined, { from }).body;
  return { app, call, read, day, week };
}

test('the mean of a day is the sum of its readings over their count', T, () => {
  const { read, day } = makeApp();
  // One reading in hour 8 and three in hour 9: 70.01 / 4 = 17.5025.
  read('dock', '2026-03-01T08:10:00Z', '10.00');
  read('dock', '2026-03-01T09:05:00Z', '20.00');
  read('dock', '2026-03-01T09:25:00Z', '20.00');
  read('dock', '2026-03-01T09:45:00Z', '20.01');
  assert.deepEqual(day('dock', '2026-03-01'), { sensor: 'dock', date: '2026-03-01', count: 4, mean: '17.50' });
  // Many readings in the night and one at noon.
  for (let i = 0; i < 20; i += 1) read('roof', `2026-03-02T02:${String(i).padStart(2, '0')}:00Z`, '5.00');
  read('roof', '2026-03-02T12:00:00Z', '25.00');
  assert.equal(day('roof', '2026-03-02').mean, '5.95');
});

test('the mean of a week is the sum of all its readings over their count', T, () => {
  const { read, day, week } = makeApp();
  read('dock', '2026-03-02T10:00:00Z', '10.00');
  for (const m of ['00', '20', '40']) read('dock', `2026-03-03T10:${m}:00Z`, '20.00');
  const res = week('dock', '2026-03-02');
  assert.equal(res.count, 4);
  assert.equal(res.mean, '17.50');
  assert.deepEqual(res.days.map((d) => [d.date, d.count, d.mean]).slice(0, 3), [['2026-03-02', 1, '10.00'], ['2026-03-03', 3, '20.00'], ['2026-03-04', 0, null]]);
  assert.equal(day('dock', '2026-03-03').mean, '20.00');
});

test('a value is read from its digits, and a text with more than two decimals gets 400', T, () => {
  const { call, read } = makeApp();
  const expected = { '1.15': 115, '0.29': 29, '4.35': 435, '19.99': 1999, '0.58': 58, '8.2': 820, '21': 2100, '-0.07': -7, '-1.15': -115, '-0.29': -29, '1.5': 150, '0.07': 7 };
  let minute = 0;
  for (const [text, hundredths] of Object.entries(expected)) {
    minute += 1;
    const saved = read('lab', `2026-03-01T10:${String(minute).padStart(2, '0')}:00Z`, text);
    assert.equal(saved.hundredths, hundredths, `value ${text}`);
  }
  for (const bad of ['21.375', '0.001', '1.', '.5', '1e2', '--1', '1,5']) {
    assert.equal(call('POST', '/readings', { sensor: 'lab', at: '2026-03-01T11:00:00Z', value: bad }).status, 400, `value ${bad}`);
  }
  assert.equal(call('GET', '/sensors/lab/day', undefined, { date: '2026-03-01' }).body.count, Object.keys(expected).length);
});

test('a mean is rounded once, and a tie goes away from zero', T, () => {
  const { read, day } = makeApp();
  read('neg', '2026-03-01T10:00:00Z', '-0.01');
  read('neg', '2026-03-01T10:30:00Z', '-0.02');
  read('pos', '2026-03-01T10:00:00Z', '0.01');
  read('pos', '2026-03-01T10:30:00Z', '0.02');
  read('mix', '2026-03-01T10:00:00Z', '-0.01');
  read('mix', '2026-03-01T10:30:00Z', '0.00');
  read('cold', '2026-03-01T10:00:00Z', '-12.34');
  read('cold', '2026-03-01T10:30:00Z', '-12.35');
  assert.equal(day('neg', '2026-03-01').mean, '-0.02');
  assert.equal(day('pos', '2026-03-01').mean, '0.02');
  assert.equal(day('mix', '2026-03-01').mean, '-0.01');
  assert.equal(day('cold', '2026-03-01').mean, '-12.35');
});

test('the job heat-alert uses the mean of the readings of the day', T, () => {
  const { app, read } = makeApp();
  // True mean 29.50, but the mean of the two hourly means is 33.00.
  read('attic', '2026-03-01T10:00:00Z', '40.00');
  for (const m of ['00', '20', '40']) read('attic', `2026-03-01T11:${m}:00Z`, '26.00');
  // True mean 31.25, but the mean of the two hourly means is 27.50.
  read('oven', '2026-03-01T10:00:00Z', '20.00');
  for (const m of ['00', '20', '40']) read('oven', `2026-03-01T11:${m}:00Z`, '35.00');
  // Exactly 30.00 is not above the level.
  read('edge', '2026-03-01T10:00:00Z', '30.00');
  read('edge', '2026-03-01T10:30:00Z', '30.00');
  read('hall', '2026-03-02T10:00:00Z', '99.00');
  assert.deepEqual(app.runJob('heat-alert', { date: '2026-03-01' }), { date: '2026-03-01', alerts: ['oven'] });
  assert.deepEqual(app.runJob('heat-alert', { date: '2026-03-02' }).alerts, ['hall']);
});

test('the original tests still pass', T, () => {
  const res = runFrozenTests('climate-logger');
  assert.ok(res.ok, res.output);
});
