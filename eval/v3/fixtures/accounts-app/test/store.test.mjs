import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeApp } from './helpers.mjs';

test('the store loads every record of the data file', () => {
  const { app } = makeApp({ seed: true });
  assert.equal(app.store.all().length, 8);
  assert.equal(app.store.get('u_1001').name, 'Ada Lovelace');
});

test('create adds one line to the file', () => {
  const { app, usersFile } = makeApp({ seed: true });
  const user = app.store.create({ name: 'New Person', email: 'new@example.test', handle: 'newp' });
  assert.equal(user.id, 'u_1009');
  assert.equal(fs.readFileSync(usersFile, 'utf8').trim().split('\n').length, 9);
});

test('remove drops the line from the file', () => {
  const { app, usersFile } = makeApp({ seed: true });
  assert.equal(app.store.remove('u_1002'), true);
  assert.equal(app.store.remove('u_1002'), false);
  assert.ok(!fs.readFileSync(usersFile, 'utf8').includes('u_1002'));
});
