import { HttpError, unauthorized } from './errors.mjs';

function compile(path) {
  const names = [];
  const source = path.replace(/:(\w+)/g, (_, name) => (names.push(name), '([^/]+)'));
  return { names, regex: new RegExp(`^${source}$`) };
}

// A route is { method, path, handle(request), public? }. A path may hold :name parts.
// A route that is not public needs a ctx with a tenant.
export function createRouter(routes) {
  const table = routes.map((route) => ({ ...route, ...compile(route.path) }));
  return {
    handle(request) {
      const { method, path, query = {}, body = {}, ctx = null } = request;
      for (const route of table) {
        const match = route.method === method ? route.regex.exec(path) : null;
        if (!match) continue;
        const params = Object.fromEntries(route.names.map((name, i) => [name, match[i + 1]]));
        try {
          if (!route.public && !ctx?.tenantId) throw unauthorized();
          return route.handle({ params, query, body, ctx });
        } catch (error) {
          if (error instanceof HttpError) return { status: error.status, body: { error: error.message } };
          throw error;
        }
      }
      return { status: 404, body: { error: 'not found' } };
    },
  };
}
