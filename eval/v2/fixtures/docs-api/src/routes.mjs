import { canAccess } from './access.mjs';

const notFound = { status: 404, body: { error: 'not found' } };
const forbidden = { status: 403, body: { error: 'forbidden' } };

// req is { method, path, user, body }. user is the id of the signed-in user.
export function route(docs, { method, path, user, body = {} }) {
  const m = /^\/docs\/(\d+)$/.exec(path);
  if (!m) return notFound;
  const doc = docs.get(Number(m[1]));
  if (!doc) return notFound;
  if (method === 'GET') return canAccess(doc, user) ? { status: 200, body: doc } : forbidden;
  if (method === 'PATCH') return canAccess(doc, user) ? { status: 200, body: docs.update(doc.id, body) } : forbidden;
  if (method === 'DELETE') {
    if (!canAccess(doc, user)) return forbidden;
    docs.remove(doc.id);
    return { status: 204 };
  }
  return notFound;
}
