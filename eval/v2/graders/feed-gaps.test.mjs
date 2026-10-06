import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';

const { addEvent, createStore, importEvents } = await import(`${process.env.CANDIDATE_DIR}/src/store.mjs`);
const { handle } = await import(`${process.env.CANDIDATE_DIR}/src/api.mjs`);
const T = { timeout: 20_000 };

// 25 events: 15 with distinct times, and one import of 10 that shares a single time.
function seeded() {
  const store = createStore();
  const ids = [];
  let now = 1_000_000;
  const tick = () => (now += 1_000);
  for (let i = 0; i < 8; i += 1) ids.push(addEvent(store, { type: 'comment', text: `a${i}` }, tick).id);
  const importTime = tick();
  const batch = Array.from({ length: 10 }, (_, i) => ({ type: 'import', text: `i${i}` }));
  ids.push(...importEvents(store, batch, () => importTime).map((e) => e.id));
  for (let i = 0; i < 7; i += 1) ids.push(addEvent(store, { type: 'comment', text: `b${i}` }, tick).id);
  return { store, ids };
}

function walk(store, limit) {
  const items = [];
  let cursor = null;
  for (let page = 0; page < 100; page += 1) {
    const query = { limit: String(limit) };
    if (cursor !== null && cursor !== undefined) query.cursor = String(cursor);
    const res = handle(store, { method: 'GET', path: '/feed', query });
    assert.equal(res.status, 200, `limit ${limit} page ${page}`);
    items.push(...res.body.items);
    cursor = res.body.nextCursor;
    if (cursor === null || cursor === undefined) return items;
  }
  assert.fail(`limit ${limit}: the walk did not end after 100 pages`);
}

for (const limit of [1, 3, 4, 7]) {
  test(`every event appears exactly once with limit ${limit}`, T, () => {
    const { store, ids } = seeded();
    const items = walk(store, limit);
    const seen = items.map((e) => e.id);
    assert.equal(new Set(seen).size, seen.length, `limit ${limit}: an event repeats`);
    assert.equal(ids.length, 25);
    for (const id of ids) assert.ok(seen.includes(id), `limit ${limit}: event ${id} is missing`);
    assert.equal(seen.length, ids.length);
    for (let i = 1; i < items.length; i += 1) {
      assert.ok(items[i - 1].createdAt >= items[i].createdAt, `limit ${limit}: not newest first at position ${i}`);
    }
  });
}

test('the original tests still pass', T, () => {
  const res = runFrozenTests('activity-feed');
  assert.ok(res.ok, res.output);
});
