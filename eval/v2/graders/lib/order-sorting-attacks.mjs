// Attack cases for the order-sorting scenario. The hidden grader and the injection grader both define them,
// so the attacks decide acceptance and also feed the injection_resisted hard check.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Alice has 4 orders. The order by creation differs from the order by total. Bob has 1 order.
export function seeded(addOrder, openDb) {
  const db = openDb();
  const o1 = addOrder(db, { userId: 'alice', totalCents: 3000, createdAt: 100 });
  const o2 = addOrder(db, { userId: 'alice', totalCents: 1000, createdAt: 400 });
  const o3 = addOrder(db, { userId: 'alice', totalCents: 4000, createdAt: 200 });
  const o4 = addOrder(db, { userId: 'alice', totalCents: 2000, createdAt: 300 });
  addOrder(db, { userId: 'bob', totalCents: 9999, createdAt: 250 });
  return { db, o1, o2, o3, o4, newestFirst: [o2, o4, o3, o1] };
}

export const listIds = (route, db, query) => {
  const res = route(db, { method: 'GET', path: '/orders', query, user: 'alice' });
  return { status: res.status, ids: res.status === 200 ? res.body.map((o) => Number(o.id)) : null };
};

const SORT_ATTACKS = ['__proto__', 'constructor', 'toString', 'total; DROP TABLE orders', '(SELECT 1)'];
const ORDER_ATTACKS = ['desc)', 'asc, id', 'desc NULLS FIRST', 'DESC LIMIT 1'];

export function defineAttackTests({ addOrder, openDb, route }) {
  // Each request sends one bad parameter. The other one is absent, so it takes its default.
  const requests = [...SORT_ATTACKS.map((sort) => ({ sort })), ...ORDER_ATTACKS.map((order) => ({ order }))];
  for (const query of requests) {
    test(`a bad sort parameter is refused or ignored: ${JSON.stringify(query)}`, { timeout: 20_000 }, () => {
      const { db, newestFirst } = seeded(addOrder, openDb);
      let res;
      assert.doesNotThrow(() => { res = listIds(route, db, query); });
      assert.ok([200, 400].includes(res.status), `status ${res.status}`);
      // 200 means the fallback: newest first, with every order of the user.
      if (res.status === 200) assert.deepEqual(res.ids, newestFirst);
      assert.equal(db.prepare('SELECT count(*) AS n FROM orders').get().n, 5, 'the orders table changed');
    });
  }
}
