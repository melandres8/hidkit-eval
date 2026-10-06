import { matchesAny } from '../lib/cidr.mjs';
import { clientKey } from '../lib/client-key.mjs';

export function createBlocklist(config) {
  return {
    isBlocked: (request) => matchesAny(clientKey(request), config.blocklist ?? []),
  };
}
