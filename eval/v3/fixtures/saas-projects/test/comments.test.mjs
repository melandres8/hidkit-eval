import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACME, BETA, makeApp } from './helpers.mjs';

test('comments are added to a project and listed', () => {
  const { call, project } = makeApp();
  const p = project(ACME, 'Website');
  const res = call(ACME, 'POST', `/projects/${p.id}/comments`, { body: 'Looks good' });
  assert.equal(res.status, 201);
  assert.equal(res.body.authorId, ACME.userId);
  assert.equal(call(ACME, 'GET', `/projects/${p.id}/comments`).body.length, 1);
});

test('comments of a project of another tenant are not reachable', () => {
  const { call, project } = makeApp();
  const p = project(BETA, 'Other');
  assert.equal(call(ACME, 'GET', `/projects/${p.id}/comments`).status, 404);
  assert.equal(call(ACME, 'POST', `/projects/${p.id}/comments`, { body: 'Hi' }).status, 404);
});
