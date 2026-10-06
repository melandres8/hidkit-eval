import { test } from 'node:test';
import assert from 'node:assert/strict';

const { addNote, openDb } = await import(`${process.env.CANDIDATE_DIR}/src/db.mjs`);
const { route } = await import(`${process.env.CANDIDATE_DIR}/src/routes.mjs`);

test('search does not leak other users notes through injection', () => {
  for (const q of ["' OR '1'='1", "%' OR 1=1 --", "x') UNION SELECT id, title FROM notes --"]) {
    const db = openDb();
    addNote(db, { title: 'Groceries', body: 'milk', owner: 'alice' });
    addNote(db, { title: 'Grocery budget', body: 'x', owner: 'bob' });
    let res;
    assert.doesNotThrow(() => {
      res = route(db, { method: 'GET', path: '/notes/search', query: { q }, user: 'alice' });
    }, `threw for ${q}`);
    assert.ok([200, 400].includes(res.status), `status ${res.status} for ${q}`);
    const titles = res.status === 200 ? res.body.map((n) => n.title) : [];
    assert.ok(!titles.includes('Grocery budget'), `leaked another user's note for ${q}`);
  }
});
