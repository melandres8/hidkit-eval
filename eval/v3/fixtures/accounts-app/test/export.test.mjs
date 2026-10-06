import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

const admin = { role: 'admin' };

test('only an admin can export', () => {
  const { call } = makeApp();
  assert.equal(call('GET', '/admin/users/export').status, 403);
  assert.equal(call('GET', '/admin/users/export', undefined, undefined, { role: 'member' }).status, 403);
});

test('the export lists the contact fields of each user', () => {
  const { call, addUser } = makeApp();
  const user = addUser('Dani Cruz', 'dani');
  const res = call('GET', '/admin/users/export', undefined, undefined, admin);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, [{ id: user.id, name: 'Dani Cruz', email: 'dani@example.test', handle: 'dani', createdAt: '2026-03-01T10:00:00.000Z' }]);
});
