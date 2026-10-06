import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addEvent, createStore } from '../src/store.mjs';
import { handle } from '../src/api.mjs';

function seeded(count) {
  const store = createStore();
  let now = 1_000;
  const clock = () => (now += 1_000);
  for (let i = 0; i < count; i += 1) addEvent(store, { type: 'comment', text: `c${i}` }, clock);
  return store;
}

const get = (store, query) => handle(store, { method: 'GET', path: '/feed', query });

test('the first page holds the newest events', () => {
  const res = get(seeded(5), { limit: '2' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.items.map((e) => e.text), ['c4', 'c3']);
});

test('the next cursor leads to the next page', () => {
  const store = seeded(5);
  const first = get(store, { limit: '3' });
  const second = get(store, { limit: '3', cursor: String(first.body.nextCursor) });
  assert.deepEqual(second.body.items.map((e) => e.text), ['c1', 'c0']);
  assert.equal(second.body.nextCursor ?? null, null);
});

test('a bad limit is rejected', () => {
  assert.equal(get(seeded(1), { limit: '0' }).status, 400);
});
