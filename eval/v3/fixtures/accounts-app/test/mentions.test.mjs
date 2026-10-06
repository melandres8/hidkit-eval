import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('mentions suggest the handles that start with the prefix', () => {
  const { call, addUser } = makeApp();
  addUser('Dani Cruz', 'dani');
  addUser('Dana Lee', 'dana');
  addUser('Cleo Park', 'cleo');
  const res = call('GET', '/mentions', undefined, { prefix: 'DA' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.map((m) => m.handle).sort(), ['dana', 'dani']);
});

test('mentions stop at five suggestions', () => {
  const { call, addUser } = makeApp();
  for (let i = 0; i < 8; i += 1) addUser(`Person ${i}`, `pat${i}`);
  assert.equal(call('GET', '/mentions', undefined, { prefix: 'pat' }).body.length, 5);
});
