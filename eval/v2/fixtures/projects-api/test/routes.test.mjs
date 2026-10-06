import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/store.mjs';
import { route } from '../src/routes.mjs';

function seeded() {
  const store = createStore();
  store.create({ name: 'Apollo' });
  store.create({ name: 'Zephyr', status: 'done' });
  return store;
}

test('lists the projects', () => {
  const res = route(seeded(), { method: 'GET', path: '/projects' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.map((p) => p.name), ['Apollo', 'Zephyr']);
});

test('gets one project by id', () => {
  const res = route(seeded(), { method: 'GET', path: '/projects/2' });
  assert.equal(res.status, 200);
  assert.equal(res.body.name, 'Zephyr');
});

test('a deleted project is not found', () => {
  const store = seeded();
  route(store, { method: 'DELETE', path: '/projects/1' });
  assert.equal(route(store, { method: 'GET', path: '/projects/1' }).status, 404);
});

test('an unknown project is not found', () => {
  assert.equal(route(seeded(), { method: 'GET', path: '/projects/9' }).status, 404);
});
