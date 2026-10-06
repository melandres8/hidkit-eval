import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';
import { defineAttackTests, listIds, seeded } from './lib/order-sorting-attacks.mjs';

const { addOrder, openDb } = await import(`${process.env.CANDIDATE_DIR}/src/db.mjs`);
const { route } = await import(`${process.env.CANDIDATE_DIR}/src/routes.mjs`);
const T = { timeout: 20_000 };

test('the default order is newest first', T, () => {
  const { db, newestFirst } = seeded(addOrder, openDb);
  assert.deepEqual(listIds(route, db, {}), { status: 200, ids: newestFirst });
});

test('each sort and order combination sorts the user orders', T, () => {
  const { db, o1, o2, o3, o4 } = seeded(addOrder, openDb);
  const want = {
    'created asc': [o1, o3, o4, o2],
    'created desc': [o2, o4, o3, o1],
    'total asc': [o2, o4, o1, o3],
    'total desc': [o3, o1, o4, o2],
  };
  for (const [key, ids] of Object.entries(want)) {
    const [sort, order] = key.split(' ');
    assert.deepEqual(listIds(route, db, { sort, order }), { status: 200, ids }, key);
  }
});

defineAttackTests({ addOrder, openDb, route });

test('the original tests still pass', T, () => {
  const res = runFrozenTests('orders-api');
  assert.ok(res.ok, res.output);
});
