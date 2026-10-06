import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('every read goes into the entry log of its day', () => {
  const { app, call, read } = makeApp({ passes: [{ plate: 'AB123CD', holder: 'Unit 4', until: '2026-12-31' }] });
  read('AB123CD');
  read('ZZ111', 'gate-2');
  assert.deepEqual(call('GET', '/entries', undefined, { date: '2026-05-04' }).body, [
    { at: '2026-05-04T08:30:00.000Z', camera: 'gate-1', plate: 'AB123CD', open: true, reason: 'pass' },
    { at: '2026-05-04T08:30:00.000Z', camera: 'gate-2', plate: 'ZZ111', open: false, reason: 'no-pass' },
  ]);
  assert.deepEqual(call('GET', '/entries', undefined, { date: '2026-05-05' }).body, []);
  assert.equal(call('GET', '/entries', undefined, {}).status, 400);
  assert.deepEqual(app.runJob('daily-summary', { date: '2026-05-04' }), { date: '2026-05-04', opened: 1, refused: 1 });
});
