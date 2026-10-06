import { clientKey } from './lib/client-key.mjs';

export function createAudit({ clock }) {
  const log = [];
  return {
    record(request, status) {
      log.push({ at: clock().toISOString(), method: request.method, path: request.path, status, address: clientKey(request) });
    },
    entries: () => [...log],
  };
}
