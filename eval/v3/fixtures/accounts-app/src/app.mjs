import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRoutes } from './api/index.mjs';
import { createRouter } from './http/router.mjs';
import { runJob } from './jobs/index.mjs';
import { createSearchIndex } from './search/index.mjs';
import { createUserStore } from './store/users.mjs';

const DEFAULT_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'users.jsonl');

export function createApp({ usersFile = DEFAULT_FILE, clock = () => new Date(), mailer = { send() {} } } = {}) {
  const store = createUserStore({ file: usersFile, clock });
  const context = { store, clock, mailer, search: createSearchIndex(store) };
  const router = createRouter(buildRoutes(context));
  return { store, handle: (request) => router.handle(request), runJob: (name) => runJob(name, context) };
}
