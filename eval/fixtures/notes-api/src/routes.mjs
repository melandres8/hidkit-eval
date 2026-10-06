import { notesFor } from './db.mjs';

export function route(db, { method, path, query, user }) {
  if (method === 'GET' && path === '/notes') return { status: 200, body: notesFor(db, user) };
  return { status: 404, body: { error: 'not found' } };
}
