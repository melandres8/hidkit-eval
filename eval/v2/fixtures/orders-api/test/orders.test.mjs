import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addOrder, openDb } from '../src/db.mjs';
import { route } from '../src/routes.mjs';

function seeded() {
  const db = openDb();
  const ids = {
    a1: addOrder(db, { userId: 'alice', totalCents: 500, createdAt: 100 }),
    a2: addOrder(db, { userId: 'alice', status: 'refunded', totalCents: 900, createdAt: 200 }),
    b1: addOrder(db, { userId: 'bob', totalCents: 700, createdAt: 150 }),
  };
  return { db, ids };
}

const get = (db, user, query = {}) => route(db, { method: 'GET', path: '/orders', query, user });

test('a user sees only their own orders', () => {
  const { db, ids } = seeded();
  const res = get(db, 'alice');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.map((o) => o.id).sort(), [ids.a1, ids.a2].sort());
});

test('the status filter keeps matching orders', () => {
  const { db, ids } = seeded();
  assert.deepEqual(get(db, 'alice', { status: 'refunded' }).body.map((o) => o.id), [ids.a2]);
});
