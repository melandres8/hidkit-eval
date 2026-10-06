import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

const week = (call, sensor, from) => call('GET', `/sensors/${sensor}/week`, undefined, { from });

test('a week has seven days and a mean', () => {
  const { call, read } = makeApp();
  read('dock', '2026-03-02T10:00:00Z', '20');
  read('dock', '2026-03-03T10:00:00Z', '22');
  const res = week(call, 'dock', '2026-03-02');
  assert.equal(res.status, 200);
  assert.equal(res.body.days.length, 7);
  assert.deepEqual(res.body.days.map((d) => d.date), ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07', '2026-03-08']);
  assert.deepEqual(res.body.days.map((d) => d.mean), ['20.00', '22.00', null, null, null, null, null]);
  assert.equal(res.body.count, 2);
  assert.equal(res.body.mean, '21.00');
});

test('a week with no readings has a null mean', () => {
  const { call } = makeApp();
  assert.deepEqual(week(call, 'dock', '2026-03-02').body.mean, null);
  assert.equal(week(call, 'dock', 'soon').status, 400);
});
