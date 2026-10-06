import { userById } from './users.mjs';

// Returns the comments of a post with the display name of each author.
export function renderComments(db, postId) {
  return db.listComments(postId).map((c) => ({ id: c.id, author: userById(db, c.authorId)?.name ?? 'unknown', text: c.text }));
}
