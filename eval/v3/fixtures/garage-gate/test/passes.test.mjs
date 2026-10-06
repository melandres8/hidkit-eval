import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('a pass can be added and listed, and then it opens the gate', () => {
  const { call, read } = makeApp();
  assert.equal(call('POST', '/passes', { plate: 'KL4455', holder: 'Unit 2', until: '2026-06-30' }).status, 201);
  assert.deepEqual(call('GET', '/passes').body, [{ plate: 'KL4455', holder: 'Unit 2', until: '2026-06-30' }]);
  assert.equal(read('KL4455').open, true);
});

test('a plate gets one pass, and bad values get 400', () => {
  const { call } = makeApp({ passes: [{ plate: 'KL4455', holder: 'Unit 2', until: '2026-06-30' }] });
  assert.equal(call('POST', '/passes', { plate: 'KL4455', holder: 'Unit 3', until: '2026-06-30' }).status, 409);
  assert.equal(call('POST', '/passes', { plate: 'MM1', holder: '', until: '2026-06-30' }).status, 400);
  assert.equal(call('POST', '/passes', { plate: 'MM1', holder: 'Unit 3', until: 'June' }).status, 400);
});

test('expired passes are removed by the job', () => {
  const { app, call } = makeApp({ passes: [{ plate: 'A1', holder: 'x', until: '2026-05-03' }, { plate: 'B2', holder: 'y', until: '2026-05-04' }] });
  assert.deepEqual(app.runJob('expire-passes'), { removed: 1 });
  assert.deepEqual(call('GET', '/passes').body.map((p) => p.plate), ['B2']);
});
