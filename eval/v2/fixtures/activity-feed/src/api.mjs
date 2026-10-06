import { listFeed } from './feed.mjs';

export function handle(store, { method, path, query = {} }) {
  if (method === 'GET' && path === '/feed') {
    const limit = query.limit === undefined ? 20 : Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) return { status: 400, body: { error: 'bad limit' } };
    const cursor = query.cursor === undefined ? undefined : Number(query.cursor);
    return { status: 200, body: listFeed(store, { cursor, limit }) };
  }
  return { status: 404, body: { error: 'not found' } };
}
