import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACME, makeApp } from './helpers.mjs';

test('search finds projects by name and tasks by title, ignoring case', () => {
  const { call, project, task } = makeApp();
  const p = project(ACME, 'Mobile Launch');
  task(ACME, p.id, 'Prepare the LAUNCH checklist');
  project(ACME, 'Billing');
  const res = call(ACME, 'GET', '/search', undefined, { q: 'launch' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.projects.map((x) => x.name), ['Mobile Launch']);
  assert.deepEqual(res.body.tasks.map((x) => x.title), ['Prepare the LAUNCH checklist']);
});

test('search needs a query', () => {
  const { call } = makeApp();
  assert.equal(call(ACME, 'GET', '/search').status, 400);
  assert.equal(call(ACME, 'GET', '/search', undefined, { q: '  ' }).status, 400);
});
