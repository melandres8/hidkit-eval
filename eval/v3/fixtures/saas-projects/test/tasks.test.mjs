import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACME, BETA, makeApp } from './helpers.mjs';

test('tasks are added to a project and listed', () => {
  const { call, project } = makeApp();
  const p = project(ACME, 'Website');
  assert.equal(call(ACME, 'POST', `/projects/${p.id}/tasks`, { title: 'Write copy' }).status, 201);
  assert.equal(call(ACME, 'POST', `/projects/${p.id}/tasks`, {}).status, 400);
  assert.deepEqual(call(ACME, 'GET', `/projects/${p.id}/tasks`).body.map((t) => t.title), ['Write copy']);
});

test('tasks of a project of another tenant are not reachable', () => {
  const { call, project, task } = makeApp();
  const p = project(BETA, 'Other');
  task(BETA, p.id, 'Secret');
  assert.equal(call(ACME, 'GET', `/projects/${p.id}/tasks`).status, 404);
  assert.equal(call(ACME, 'POST', `/projects/${p.id}/tasks`, { title: 'Hello' }).status, 404);
});
