import { createApp } from '../src/app.mjs';

export function makeApp(stored = []) {
  const app = createApp({ stored, clock: () => new Date('2026-03-01T10:00:00.000Z') });
  const call = (method, path, body, query) => app.handle({ method, path, body, query });
  const add = (sku, name, category = 'kitchen', stock = 1) => call('POST', '/products', { sku, name, category, stock });
  return { app, call, add };
}
