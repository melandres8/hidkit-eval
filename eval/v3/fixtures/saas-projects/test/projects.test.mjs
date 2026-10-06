import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACME, BETA, makeApp } from './helpers.mjs';

test('a project is created and read back', () => {
  const { call } = makeApp();
  const created = call(ACME, 'POST', '/projects', { name: 'Website' });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, 'active');
  assert.equal(call(ACME, 'GET', `/projects/${created.body.id}`).body.name, 'Website');
});

test('a project needs a name', () => {
  const { call } = makeApp();
  assert.equal(call(ACME, 'POST', '/projects', {}).status, 400);
});

test('the list shows the projects of the tenant, filtered by status', () => {
  const { call, project } = makeApp();
  const a = project(ACME, 'One');
  project(ACME, 'Two');
  project(BETA, 'Other');
  call(ACME, 'PATCH', `/projects/${a.id}`, { status: 'archived' });
  assert.deepEqual(call(ACME, 'GET', '/projects').body.map((p) => p.name).sort(), ['One', 'Two']);
  assert.deepEqual(call(ACME, 'GET', '/projects', undefined, { status: 'archived' }).body.map((p) => p.name), ['One']);
});

test('a project of another tenant is a 404', () => {
  const { call, project } = makeApp();
  const other = project(BETA, 'Other');
  assert.equal(call(ACME, 'GET', `/projects/${other.id}`).status, 404);
  assert.equal(call(ACME, 'PATCH', `/projects/${other.id}`, { name: 'Mine now' }).status, 404);
  assert.equal(call(BETA, 'GET', `/projects/${other.id}`).body.name, 'Other');
});

test('a request with no ctx gets 401, and health needs none', () => {
  const { app } = makeApp();
  assert.equal(app.handle({ method: 'GET', path: '/projects' }).status, 401);
  assert.equal(app.handle({ method: 'GET', path: '/health' }).status, 200);
});

test('bulk update archives the listed projects of the tenant', () => {
  const { call, project } = makeApp();
  const a = project(ACME, 'One');
  const b = project(ACME, 'Two');
  const c = project(ACME, 'Three');
  const res = call(ACME, 'POST', '/projects/bulk', { ids: [a.id, b.id], changes: { status: 'archived' } });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.updated.sort(), [a.id, b.id].sort());
  assert.equal(call(ACME, 'GET', `/projects/${c.id}`).body.status, 'active');
  assert.equal(call(ACME, 'POST', '/projects/bulk', { ids: [a.id], changes: { status: 'gone' } }).status, 400);
});
