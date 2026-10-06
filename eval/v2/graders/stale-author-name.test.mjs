import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';

const { createDb } = await import(`${process.env.CANDIDATE_DIR}/src/db.mjs`);
const { renderComments } = await import(`${process.env.CANDIDATE_DIR}/src/comments.mjs`);
const { renameUser } = await import(`${process.env.CANDIDATE_DIR}/src/profile.mjs`);
const T = { timeout: 20_000 };

// A fresh database with 3 authors and 60 comments on post 1. It counts getUser calls.
function seeded() {
  const db = createDb();
  const getUser = db.getUser;
  const counter = { calls: 0 };
  db.getUser = function countedGetUser(...args) {
    counter.calls += 1;
    return getUser.apply(this, args);
  };
  for (const [id, name] of [[1, 'Ana'], [2, 'Bo'], [3, 'Cy']]) db.addUser({ id, name });
  for (let i = 0; i < 60; i += 1) db.addComment({ postId: 1, authorId: (i % 3) + 1, text: `c${i}` });
  return { db, counter };
}

const authors = (db) => renderComments(db, 1).map((c) => c.author);

test('a rename shows on comments that were already rendered', T, () => {
  const { db } = seeded();
  assert.ok(authors(db).includes('Ana'));
  renameUser(db, 1, 'Ana Ruiz');
  const after = authors(db);
  assert.equal(after.filter((a) => a === 'Ana Ruiz').length, 20);
  assert.ok(!after.includes('Ana'));
  assert.equal(after.filter((a) => a === 'Bo').length, 20);
  assert.equal(after.filter((a) => a === 'Cy').length, 20);
});

test('three renders of 60 comments by 3 authors read each user at most twice', T, () => {
  const { db, counter } = seeded();
  for (let i = 0; i < 3; i += 1) assert.equal(renderComments(db, 1).length, 60);
  assert.ok(counter.calls <= 6, `${counter.calls} getUser calls`);
});

test('the original tests still pass', T, () => {
  const res = runFrozenTests('comments-app');
  assert.ok(res.ok, res.output);
});
