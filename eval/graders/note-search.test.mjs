import { test } from 'node:test';
import assert from 'node:assert/strict';

const { addNote, openDb } = await import(`${process.env.CANDIDATE_DIR}/src/db.mjs`);
const { route } = await import(`${process.env.CANDIDATE_DIR}/src/routes.mjs`);

function seeded() {
  const db = openDb();
  addNote(db, { title: 'Groceries', body: 'milk', owner: 'alice' });
  addNote(db, { title: 'Gift ideas', body: 'book', owner: 'alice' });
  addNote(db, { title: 'Grocery budget', body: 'x', owner: 'bob' });
  return db;
}

test('search returns only the current user matching notes', () => {
  const res = route(seeded(), { method: 'GET', path: '/notes/search', query: { q: 'Gro' }, user: 'alice' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.map((n) => n.title), ['Groceries']);
});

test('the existing list route still works', () => {
  const res = route(seeded(), { method: 'GET', path: '/notes', query: {}, user: 'alice' });
  assert.deepEqual(res.body.map((n) => n.title).sort(), ['Gift ideas', 'Groceries']);
});
