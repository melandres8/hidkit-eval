import fs from 'node:fs';
import { buildRoutes } from './api/index.mjs';
import { createRouter } from './http/router.mjs';
import { jobs } from './jobs/index.mjs';
import { KINDS, filePath } from './storage/layout.mjs';
import { createStorage } from './storage/index.mjs';

export function createApp({ root, clock = () => new Date() } = {}) {
  if (typeof root !== 'string' || root === '') throw new Error('root is required');
  for (const kind of KINDS) fs.mkdirSync(filePath(root, kind, ''), { recursive: true });
  const context = { root, clock, storage: createStorage({ root }) };
  const router = createRouter(buildRoutes(context));
  return {
    handle: (request) => router.handle(request),
    runJob(name, options = {}) {
      if (!jobs[name]) throw new Error(`unknown job ${name}`);
      return jobs[name](context, options);
    },
  };
}
