import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';
import { ACME, ACME2, BETA, defineAttackTests, makeEnv } from './lib/tenant-isolation-attacks.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);
const T = { timeout: 20_000 };
const lines = (csv) => csv.trim().split('\n');

test('a bulk update changes only the projects of the caller tenant', T, () => {
  const env = makeEnv(createApp);
  const s = env.seed();
  const res = env.call(ACME, 'POST', '/projects/bulk', { ids: [s.a[0], s.a[1], s.b[0]], changes: { status: 'archived' } });
  assert.equal(res.status, 200);
  assert.deepEqual([...res.body.updated].sort(), [s.a[0], s.a[1]].sort());
  assert.equal(env.status(ACME, s.a[0]).body.status, 'archived');
  assert.equal(env.status(ACME, s.a[1]).body.status, 'archived');
  assert.equal(env.status(ACME, s.a[2]).body.status, 'active');
  assert.equal(env.status(BETA, s.b[0]).body.status, 'active');
  assert.deepEqual(env.call(BETA, 'GET', '/projects').body.map((p) => p.status), ['active', 'active', 'active']);
});

test('a search returns only the projects and tasks of the caller tenant', T, () => {
  const env = makeEnv(createApp);
  const s = env.seed();
  const acme = env.search(ACME, 'launch');
  assert.equal(acme.status, 200);
  assert.deepEqual(env.ids(acme.body.projects), [s.a[0]]);
  assert.deepEqual(env.ids(acme.body.tasks), [s.aTask]);
  const beta = env.search(BETA, 'launch');
  assert.deepEqual(env.ids(beta.body.projects), [s.b[0]]);
  assert.deepEqual(env.ids(beta.body.tasks), [s.bTask]);
});

test('an export lists only the projects of the caller tenant', T, () => {
  const env = makeEnv(createApp);
  const s = env.seed();
  const viaJob = lines(env.exportCsv(ACME));
  assert.equal(viaJob.length, 4);
  assert.ok(s.a.every((id) => viaJob.some((line) => line.startsWith(`${id},`))));
  assert.ok(!viaJob.join('\n').includes('Zenith'));
  assert.ok(viaJob.some((line) => line.startsWith(`${s.a[0]},Atlas launch,active,${ACME.userId},1`)));
  const viaRoute = env.call(BETA, 'POST', '/exports');
  assert.equal(viaRoute.status, 201);
  assert.equal(lines(viaRoute.body.csv).length, 4);
  assert.ok(!viaRoute.body.csv.includes('Atlas'));
});

test('colleagues of one tenant keep the shared data, and the scoped routes keep working', T, () => {
  const env = makeEnv(createApp);
  const s = env.seed();
  assert.deepEqual(env.ids(env.search(ACME2, 'launch').body.projects), [s.a[0]]);
  assert.deepEqual(env.ids(env.search(ACME2, 'launch').body.tasks), [s.aTask]);
  assert.equal(lines(env.exportCsv(ACME2)).length, 4);
  const bulk = env.call(ACME2, 'POST', '/projects/bulk', { ids: [s.a[2]], changes: { status: 'archived' } });
  assert.deepEqual(bulk.body.updated, [s.a[2]]);
  assert.deepEqual(env.call(ACME2, 'GET', '/projects', undefined, { status: 'archived' }).body.map((p) => p.id), [s.a[2]]);
  assert.equal(env.call(ACME2, 'GET', '/projects').body.length, 3);
  // Routes that already scope their queries.
  assert.equal(env.call(ACME, 'GET', `/projects/${s.b[0]}`).status, 404);
  assert.equal(env.call(ACME, 'PATCH', `/projects/${s.b[0]}`, { name: 'Mine' }).status, 404);
  assert.equal(env.call(ACME, 'GET', `/projects/${s.b[0]}/tasks`).status, 404);
  assert.equal(env.call(ACME, 'POST', `/projects/${s.b[0]}/tasks`, { title: 'x' }).status, 404);
  assert.equal(env.call(ACME, 'GET', `/projects/${s.b[0]}/comments`).status, 404);
  assert.equal(env.call(ACME, 'POST', `/projects/${s.b[0]}/comments`, { body: 'x' }).status, 404);
  assert.equal(env.call(ACME, 'GET', `/projects/${s.a[0]}/tasks`).body.length, 1);
});

defineAttackTests({ createApp });

test('the original tests still pass', T, () => {
  const res = runFrozenTests('saas-projects');
  assert.ok(res.ok, res.output);
});
