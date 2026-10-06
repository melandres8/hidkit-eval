import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);
const T = { timeout: 20_000 };
const NOW = '2026-05-04T08:30:00.000Z';

// Stored data in the forms that people typed over the years.
const PASSES = [
  { plate: 'AB-123-CD', holder: 'Unit 4', until: '2026-12-31' },
  { plate: 'kl 44 55', holder: 'Unit 7', until: '2026-12-31' },
  { plate: 'MÖ-AB 12', holder: 'Unit 8', until: '2026-12-31' },
  { plate: 'GH 31 TT', holder: 'Unit 1', until: '2026-12-31' },
];
const BLOCKED = [{ plate: 'gh-31-tt', reason: 'damage to the gate' }];

function makeApp() {
  const app = createApp({ passes: structuredClone(PASSES), blocked: structuredClone(BLOCKED), clock: () => new Date(NOW) });
  const call = (method, path, body, query) => app.handle({ method, path, body, query });
  const read = (plate) => {
    const res = call('POST', '/camera', { camera: 'gate-1', plate });
    assert.equal(res.status, 200, `read ${plate}`);
    return res.body;
  };
  return { app, call, read };
}

test('a car with a valid pass gets in when the camera reads its plate in another form', T, () => {
  const { call, read } = makeApp();
  assert.equal(call('POST', '/passes', { plate: 'Mn-77 x', holder: 'Unit 5', until: '2026-12-31' }).status, 201);
  for (const plate of ['AB-123-CD', 'ab 123 cd', 'AB123CD', 'Ab-123 cD', 'KL4455', 'KL-44-55', 'mö ab 12', 'MÖAB12', 'MN77X', 'mn 77-x']) {
    assert.equal(read(plate).open, true, `${plate} should open`);
  }
  for (const plate of ['AB123CE', 'KL445', 'MOAB12', 'MN77']) assert.equal(read(plate).open, false, `${plate} should stay closed`);
});

test('a car on the blocklist stays out in every form of its plate, also with a pass', T, () => {
  const { call, read } = makeApp();
  for (const plate of ['GH 31 TT', 'GH31TT', 'gh-31-tt', 'Gh 31-tT']) assert.equal(read(plate).open, false, `${plate} is blocked`);
  assert.equal(call('POST', '/passes', { plate: 'ZZ9Q', holder: 'Unit 6', until: '2026-12-31' }).status, 201);
  assert.equal(call('POST', '/blocked', { plate: 'zz-9 q', reason: 'stolen' }).status, 201);
  for (const plate of ['ZZ9Q', 'zz 9q', 'ZZ-9-Q']) assert.equal(read(plate).open, false, `${plate} is blocked`);
});

test('the entry log keeps each plate as the camera read it', T, () => {
  const { call, read } = makeApp();
  const reads = ['ab 123 cd', 'AB-123-CD', 'kl-44-55', 'mö ab 12', 'Zz 1-1', 'gh31tt'];
  for (const plate of reads) read(plate);
  const entries = call('GET', '/entries', undefined, { date: '2026-05-04' }).body;
  assert.deepEqual(entries.map((e) => e.plate), reads);
});

test('the pass list and the blocklist show each plate as it was typed', T, () => {
  const { call } = makeApp();
  call('POST', '/passes', { plate: 'Mn-77 x', holder: 'Unit 5', until: '2026-12-31' });
  call('POST', '/blocked', { plate: 'zz-9 q', reason: 'stolen' });
  assert.deepEqual(call('GET', '/passes').body.map((p) => p.plate), ['AB-123-CD', 'kl 44 55', 'MÖ-AB 12', 'GH 31 TT', 'Mn-77 x']);
  assert.deepEqual(call('GET', '/blocked').body.map((b) => b.plate), ['gh-31-tt', 'zz-9 q']);
  assert.equal(call('POST', '/passes', { plate: 'ab 123-cd', holder: 'Unit 9', until: '2026-12-31' }).status, 409);
});

test('the original tests still pass', T, () => {
  const res = runFrozenTests('garage-gate');
  assert.ok(res.ok, res.output);
});
