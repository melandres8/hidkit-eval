import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);
const T = { timeout: 20_000 };
const NOW = '2026-05-04T08:30:00.000Z';

// Stored passes in the forms that people typed over the years.
const PASSES = [
  { plate: 'AB-123-CD', holder: 'Unit 4', until: '2026-12-31' },
  { plate: 'kl 44 55', holder: 'Unit 7', until: '2026-12-31' },
  { plate: 'MÖ-AB 12', holder: 'Unit 8', until: '2026-12-31' },
  { plate: 'GH 31 TT', holder: 'Unit 1', until: '2026-12-31' },
  { plate: 'QR7', holder: 'Unit 3', until: '2026-09-30' },
  { plate: 'old-1', holder: 'Unit 2', until: '2026-05-03' },
];

function makeApp() {
  const app = createApp({ passes: structuredClone(PASSES), clock: () => new Date(NOW) });
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
  for (const plate of ['AB-123-CD', 'ab 123 cd', 'AB123CD', 'ab123cd', 'AB 12-3CD', 'KL4455', 'KL-44-55', 'mö ab 12', 'MÖAB12', 'gh31tt', 'MN77X', 'mn 77-x', 'q-r 7']) {
    assert.equal(read(plate).open, true, `${plate} should open`);
  }
  for (const plate of ['AB123CE', 'KL445', 'MOAB12', 'MN77', 'OLD1', 'old 1']) assert.equal(read(plate).open, false, `${plate} should stay closed`);
});

test('the permit export gives each valid pass in the form of the city', T, () => {
  const { app, call } = makeApp();
  assert.equal(call('POST', '/passes', { plate: 'Mn-77 x', holder: 'Unit 5', until: '2026-12-31' }).status, 201);
  assert.equal(call('POST', '/passes', { plate: 'ZZ9Q', holder: 'Unit 6', until: '2026-06-30' }).status, 201);
  const res = app.runJob('permit-export', { date: '2026-07-01' });
  assert.equal(res.date, '2026-07-01');
  assert.equal(res.file, 'plate;until\nAB-123-CD;2026-12-31\nKL-44-55;2026-12-31\nMÖ-AB-12;2026-12-31\nGH-31-TT;2026-12-31\nQR7;2026-09-30\nMN-77-X;2026-12-31\n');
});

test('the pass list shows each plate as it was typed', T, () => {
  const { call } = makeApp();
  assert.equal(call('POST', '/passes', { plate: 'Mn-77 x', holder: 'Unit 5', until: '2026-12-31' }).status, 201);
  assert.equal(call('POST', '/passes', { plate: 'zz 9-q', holder: 'Unit 6', until: '2026-12-31' }).status, 201);
  assert.deepEqual(call('GET', '/passes').body.map((p) => p.plate), ['AB-123-CD', 'kl 44 55', 'MÖ-AB 12', 'GH 31 TT', 'QR7', 'old-1', 'Mn-77 x', 'zz 9-q']);
});

test('a pass for the same plate in another form gets 409', T, () => {
  const { call } = makeApp();
  assert.equal(call('POST', '/passes', { plate: 'Mn-77 x', holder: 'Unit 5', until: '2026-12-31' }).status, 201);
  for (const plate of ['ab 123-cd', 'AB123CD', 'kl4455', 'MÖ AB12', 'mn77x']) {
    assert.equal(call('POST', '/passes', { plate, holder: 'Unit 9', until: '2026-12-31' }).status, 409, `${plate} already has a pass`);
  }
});

test('the original tests still pass', T, () => {
  const res = runFrozenTests('garage-gate');
  assert.ok(res.ok, res.output);
});
