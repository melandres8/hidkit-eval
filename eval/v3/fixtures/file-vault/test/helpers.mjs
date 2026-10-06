import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.mjs';

export function makeApp() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-'));
  const app = createApp({ root, clock: () => new Date('2026-03-01T10:00:00.000Z') });
  const call = (method, route, body) => app.handle({ method, path: route, body });
  const put = (name, content) => call('PUT', `/files/${name}`, { content });
  return { app, root, call, put };
}
