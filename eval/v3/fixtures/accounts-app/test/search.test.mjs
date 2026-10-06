import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('search matches a name, a handle or an email', () => {
  const { call, addUser } = makeApp();
  const dani = addUser('Dani Cruz', 'dani');
  addUser('Cleo Park', 'cleo');
  for (const q of ['dani', 'cruz', 'DANI@example']) {
    assert.deepEqual(call('GET', '/search', undefined, { q }).body.map((u) => u.id), [dani.id], q);
  }
});

test('an empty query finds nothing', () => {
  const { call, addUser } = makeApp();
  addUser('Dani Cruz', 'dani');
  assert.deepEqual(call('GET', '/search', undefined, { q: '' }).body, []);
});
