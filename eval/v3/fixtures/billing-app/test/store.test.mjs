import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeApp, simpleDraft } from './helpers.mjs';

test('the store loads every invoice file', () => {
  const { app } = makeApp({ seed: true });
  assert.equal(app.store.list().length, 7);
  assert.equal(app.store.get('inv-2025-0001').customer, 'Acme Supplies');
});

test('a new draft gets the next number of the year and its own file', () => {
  const { app, dataDir } = makeApp({ seed: true });
  const draft = app.store.createDraft(simpleDraft());
  assert.equal(draft.id, 'inv-2026-0001');
  assert.ok(fs.existsSync(path.join(dataDir, 'inv-2026-0001.json')));
  assert.equal(app.store.createDraft(simpleDraft()).id, 'inv-2026-0002');
});

test('issuing stores the totals and the date, and a second issue does nothing', () => {
  const { app } = makeApp();
  const { id } = app.store.createDraft(simpleDraft());
  const issued = app.store.issue(id);
  assert.equal(issued.status, 'issued');
  assert.deepEqual(issued.totals, { subtotal: 2000, tax: 200, total: 2200 });
  assert.equal(issued.issuedAt, '2026-03-01T10:00:00.000Z');
  assert.equal(app.store.issue(id), null);
});
