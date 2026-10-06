import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRoutes } from './api/index.mjs';
import { createRouter } from './http/router.mjs';
import { createInvoiceStore } from './store/invoices.mjs';

const DEFAULT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'invoices');

export function createApp({ dataDir = DEFAULT_DIR, clock = () => new Date() } = {}) {
  const store = createInvoiceStore({ dir: dataDir, clock });
  const router = createRouter(buildRoutes({ store, clock }));
  return { store, handle: (request) => router.handle(request) };
}
