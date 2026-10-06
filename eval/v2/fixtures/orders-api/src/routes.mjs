import { listOrders } from './orders.mjs';

// req is { method, path, query, user }. user is the id of the signed-in user.
export function route(db, { method, path, query = {}, user }) {
  if (method === 'GET' && path === '/orders') {
    return { status: 200, body: listOrders(db, { userId: user, status: query.status }) };
  }
  return { status: 404, body: { error: 'not found' } };
}
