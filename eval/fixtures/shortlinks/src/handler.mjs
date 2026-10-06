import { MESSAGES } from './messages.mjs';

export function handle(store, path) {
  const url = store.resolve(path.replace(/^\//, ''));
  if (url === null) return { status: 404, body: MESSAGES.notFound };
  return { status: 302, headers: { location: url } };
}
