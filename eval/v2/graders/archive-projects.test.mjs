import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';

const { createStore } = await import(`${process.env.CANDIDATE_DIR}/src/store.mjs`);
const { route } = await import(`${process.env.CANDIDATE_DIR}/src/routes.mjs`);
const { exportAll } = await import(`${process.env.CANDIDATE_DIR}/src/export.mjs`);
const T = { timeout: 20_000 };

// Three projects, and the second one is deleted through the route.
function archivedOne() {
  const store = createStore();
  const apollo = store.create({ name: 'Apollo' });
  const apex = store.create({ name: 'Apex' });
  const zephyr = store.create({ name: 'Zephyr', status: 'done' });
  const res = route(store, { method: 'DELETE', path: `/projects/${apex.id}` });
  assert.ok([200, 204].includes(res.status), `delete answered ${res.status}`);
  return { store, apollo, apex, zephyr };
}

const get = (store, path, query = {}) => route(store, { method: 'GET', path, query });
const ids = (list) => list.map((p) => p.id).sort((a, b) => a - b);
// Statuses with a count of 0 are the same as absent ones.
const nonZero = (counts) => Object.fromEntries(Object.entries(counts).filter(([, n]) => n !== 0));

test('the list hides an archived project', T, () => {
  const { store, apollo, zephyr } = archivedOne();
  const res = get(store, '/projects');
  assert.equal(res.status, 200);
  assert.deepEqual(ids(res.body), ids([apollo, zephyr]));
});

test('a get by id of an archived project is not found', T, () => {
  const { store, apex } = archivedOne();
  assert.equal(get(store, `/projects/${apex.id}`).status, 404);
});

test('the search hides an archived project', T, () => {
  const { store, apollo } = archivedOne();
  const res = get(store, '/projects/search', { q: 'ap' });
  assert.equal(res.status, 200);
  assert.deepEqual(ids(res.body), ids([apollo]));
});

test('the stats do not count an archived project', T, () => {
  const { store } = archivedOne();
  const res = get(store, '/stats');
  assert.equal(res.status, 200);
  assert.deepEqual(nonZero(res.body), { active: 1, done: 1 });
});

test('the support export keeps an archived project', T, () => {
  const { store, apollo, apex, zephyr } = archivedOne();
  assert.deepEqual(ids(exportAll(store)), ids([apollo, apex, zephyr]));
});

test('the original tests still pass', T, () => {
  const res = runFrozenTests('projects-api');
  assert.ok(res.ok, res.output);
});
