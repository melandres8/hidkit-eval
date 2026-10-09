import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

const PASSES = [{ plate: 'AB123CD', holder: 'Unit 4', until: '2026-12-31' }, { plate: 'XY987', holder: 'Unit 9', until: '2026-05-03' }];

test('a car with a valid pass gets in', () => {
  const { read } = makeApp({ passes: PASSES });
  assert.deepEqual(read('AB123CD'), { open: true, reason: 'pass' });
});

test('a car with no pass, or an expired pass, stays out', () => {
  const { read } = makeApp({ passes: PASSES });
  assert.deepEqual(read('ZZ111'), { open: false, reason: 'no-pass' });
  assert.deepEqual(read('XY987'), { open: false, reason: 'no-pass' });
});

test('a bad camera event gets 400', () => {
  const { call } = makeApp();
  assert.equal(call('POST', '/camera', { camera: 'gate-1', plate: '' }).status, 400);
  assert.equal(call('POST', '/camera', { camera: 'gate-1', plate: 'AB/12' }).status, 400);
  assert.equal(call('POST', '/camera', { plate: 'AB12' }).status, 400);
});
