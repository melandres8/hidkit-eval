import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

const day = (call, sensor, date) => call('GET', `/sensors/${sensor}/day`, undefined, { date });

test('the mean of a day with the same number of readings in each hour', () => {
  const { call, read } = makeApp();
  read('dock', '2026-03-01T08:10:00Z', '20.00');
  read('dock', '2026-03-01T08:40:00Z', '22.00');
  read('dock', '2026-03-01T09:10:00Z', '24.00');
  read('dock', '2026-03-01T09:40:00Z', '26.00');
  assert.deepEqual(day(call, 'dock', '2026-03-01').body, { sensor: 'dock', date: '2026-03-01', count: 4, mean: '23.00' });
});

test('readings of another day or sensor do not count', () => {
  const { call, read } = makeApp();
  read('dock', '2026-03-01T23:59:59Z', '10');
  read('dock', '2026-03-02T00:00:00Z', '30');
  read('roof', '2026-03-02T00:00:00Z', '50');
  assert.equal(day(call, 'dock', '2026-03-02').body.mean, '30.00');
  assert.equal(day(call, 'dock', '2026-03-01').body.mean, '10.00');
});

test('a day with no readings has a null mean, and a bad date gets 400', () => {
  const { call } = makeApp();
  assert.deepEqual(day(call, 'dock', '2026-03-01').body, { sensor: 'dock', date: '2026-03-01', count: 0, mean: null });
  assert.equal(day(call, 'dock', '2026-3-1').status, 400);
  assert.equal(day(call, 'dock', undefined).status, 400);
});

test('a negative mean is written with its sign', () => {
  const { call, read } = makeApp();
  read('cold', '2026-01-10T03:00:00Z', '-12.50');
  read('cold', '2026-01-10T03:30:00Z', '-7.50');
  assert.equal(day(call, 'cold', '2026-01-10').body.mean, '-10.00');
});
