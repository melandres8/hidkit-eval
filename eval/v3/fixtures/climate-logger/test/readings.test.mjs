import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('a reading is stored in hundredths of a degree', () => {
  const { read } = makeApp();
  const res = read('dock', '2026-03-01T10:15:00Z', '21.37');
  assert.equal(res.status, 201);
  assert.deepEqual(res.body, { id: 'r_1', sensor: 'dock', at: '2026-03-01T10:15:00.000Z', hundredths: 2137 });
  assert.equal(read('dock', '2026-03-01T10:16:00Z', '-0.5').body.hundredths, -50);
  assert.equal(read('dock', '2026-03-01T10:17:00Z', '20').body.hundredths, 2000);
});

test('a reading needs a sensor, a date and a value', () => {
  const { read } = makeApp();
  assert.equal(read('', '2026-03-01T10:15:00Z', '21.37').status, 400);
  assert.equal(read('dock', 'yesterday', '21.37').status, 400);
  assert.equal(read('dock', '2026-03-01T10:15:00Z', 'warm').status, 400);
  assert.equal(read('dock', '2026-03-01T10:15:00Z', 21.37).status, 400);
});

test('the sensor list has each sensor once, in order', () => {
  const { call, read } = makeApp();
  read('roof', '2026-03-01T10:00:00Z', '10');
  read('dock', '2026-03-01T10:00:00Z', '10');
  read('roof', '2026-03-01T11:00:00Z', '10');
  assert.deepEqual(call('GET', '/sensors').body, ['dock', 'roof']);
});
