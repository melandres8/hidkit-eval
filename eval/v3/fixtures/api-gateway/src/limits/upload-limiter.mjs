import { clientKey } from '../lib/client-key.mjs';
import { createLimiter } from '../lib/limiter.mjs';

export function createUploadLimiter({ config, clock }) {
  const limiter = createLimiter({ ...config.limits.upload, clock });
  return { check: (request) => limiter.check(clientKey(request)) };
}
