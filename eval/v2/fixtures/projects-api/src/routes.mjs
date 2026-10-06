import { searchProjects } from './search.mjs';
import { projectStats } from './stats.mjs';

const notFound = { status: 404, body: { error: 'not found' } };

export function route(store, { method, path, query = {} }) {
  if (method === 'GET' && path === '/projects') return { status: 200, body: store.all() };
  if (method === 'GET' && path === '/projects/search') return { status: 200, body: searchProjects(store, query.q) };
  if (method === 'GET' && path === '/stats') return { status: 200, body: projectStats(store) };
  const m = /^\/projects\/(\d+)$/.exec(path);
  if (!m) return notFound;
  const id = Number(m[1]);
  if (method === 'GET') {
    const project = store.get(id);
    return project ? { status: 200, body: project } : notFound;
  }
  if (method === 'DELETE') return store.remove(id) ? { status: 204 } : notFound;
  return notFound;
}
