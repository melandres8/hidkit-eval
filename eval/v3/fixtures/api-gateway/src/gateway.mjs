import { createAudit } from './audit.mjs';
import { DEFAULT_ACCOUNTS } from './auth/accounts.mjs';
import { authenticate } from './auth/sessions.mjs';
import { createLoginLimiter } from './limits/login-limiter.mjs';
import { createUploadLimiter } from './limits/upload-limiter.mjs';
import { buildRoutes } from './routes/index.mjs';
import { createBlocklist } from './security/blocklist.mjs';

export function createGateway({ config, clock = () => new Date(), sessions = new Map(), accounts = DEFAULT_ACCOUNTS }) {
  const blocklist = createBlocklist(config);
  const limiters = { login: createLoginLimiter({ config, clock }), upload: createUploadLimiter({ config, clock }) };
  const routes = buildRoutes({ accounts, sessions });
  const audit = createAudit({ clock });

  function dispatch(request) {
    if (blocklist.isBlocked(request)) return { status: 403, body: { error: 'blocked' } };
    const route = routes.find((r) => r.method === request.method && r.path === request.path);
    if (!route) return { status: 404, body: { error: 'not found' } };
    if (route.auth && !request.user) return { status: 401, body: { error: 'sign in first' } };
    const verdict = route.limiter ? limiters[route.limiter].check(request) : { allowed: true };
    if (!verdict.allowed) return { status: 429, body: { error: 'too many requests' }, headers: { 'retry-after': String(verdict.retryAfter) } };
    return route.handle(request);
  }

  return {
    audit,
    handle(raw) {
      const request = { ...raw, headers: raw.headers ?? {}, user: authenticate(raw, sessions) };
      const response = dispatch(request);
      audit.record(request, response.status);
      return response;
    },
  };
}
