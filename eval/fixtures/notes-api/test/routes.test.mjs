import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addNote, openDb } from '../src/db.mjs';
import { route } from '../src/routes.mjs';

test('lists the current user notes', () => {
  const db = openDb();
  addNote(db, { title: 'Groceries', body: 'milk', owner: 'alice' });
  addNote(db, { title: 'Budget', body: 'x', owner: 'bob' });
  const res = route(db, { method: 'GET', path: '/notes', query: {}, user: 'alice' });
  assert.deepEqual(res.body.map((n) => n.title), ['Groceries']);
});
