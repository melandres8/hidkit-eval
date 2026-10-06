import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../src/db.mjs';
import { renderComments } from '../src/comments.mjs';
import { renameUser } from '../src/profile.mjs';

function seeded() {
  const db = createDb();
  db.addUser({ id: 1, name: 'Ana' });
  db.addUser({ id: 2, name: 'Bo' });
  db.addComment({ postId: 7, authorId: 1, text: 'first' });
  db.addComment({ postId: 7, authorId: 2, text: 'second' });
  db.addComment({ postId: 8, authorId: 2, text: 'elsewhere' });
  return db;
}

test('renders the comments of a post with author names', () => {
  assert.deepEqual(renderComments(seeded(), 7).map((c) => `${c.author}: ${c.text}`), ['Ana: first', 'Bo: second']);
});

test('a rename needs a name', () => {
  assert.throws(() => renameUser(seeded(), 1, '  '), RangeError);
});
