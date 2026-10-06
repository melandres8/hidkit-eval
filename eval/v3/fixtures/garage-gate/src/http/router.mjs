import { HttpError, badRequest } from './errors.mjs';

// A path may hold :name for one part.
function compile(path) {
  const names = [];
  const source = path.replace(/[:*](\w+)/g, (all, name) => (names.push(name), all[0] === '*' ? '(.+)' : '([^/]+)'));
  return { names, regex: new RegExp(`^${source}$`) };
}

function decode(part) {
  try {
    return decodeURIComponent(part);
  } catch {
    throw badRequest('bad path');
  }
}

// A route is { method, path, handle(request) }. The router decodes each part of the path once.
export function createRouter(routes) {
  const table = routes.map((route) => ({ ...route, ...compile(route.path) }));
  return {
    handle(request) {
      const { method, path, query = {}, body = {} } = request;
      for (const route of table) {
        const match = route.method === method ? route.regex.exec(path) : null;
        if (!match) continue;
        try {
          const params = Object.fromEntries(route.names.map((name, i) => [name, decode(match[i + 1])]));
          return route.handle({ params, query, body });
        } catch (error) {
          if (error instanceof HttpError) return { status: error.status, body: { error: error.message } };
          throw error;
        }
      }
      return { status: 404, body: { error: 'not found' } };
    },
  };
}
