import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('a user is created and read back as a public profile', () => {
  const { call } = makeApp();
  const created = call('POST', '/users', { name: 'Dani Cruz', email: 'dani@example.test', handle: 'dani' });
  assert.equal(created.status, 201);
  const profile = call('GET', `/users/${created.body.id}`);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.name, 'Dani Cruz');
  assert.equal(profile.body.email, undefined);
});

test('a handle can be used once', () => {
  const { call } = makeApp();
  call('POST', '/users', { name: 'A', email: 'a@example.test', handle: 'same' });
  assert.equal(call('POST', '/users', { name: 'B', email: 'b@example.test', handle: 'same' }).status, 409);
});

test('a deleted user is not found', () => {
  const { call, addUser } = makeApp();
  const user = addUser('Dara Vance', 'dara');
  assert.equal(call('DELETE', `/users/${user.id}`).status, 204);
  assert.equal(call('GET', `/users/${user.id}`).status, 404);
  assert.equal(call('DELETE', '/users/u_9999').status, 404);
});
