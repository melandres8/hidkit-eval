import { clientKey } from '../lib/client-key.mjs';
import { createLimiter } from '../lib/limiter.mjs';

export function createLoginLimiter({ config, clock }) {
  const limiter = createLimiter({ ...config.limits.login, clock });
  return { check: (request) => limiter.check(clientKey(request)) };
}
