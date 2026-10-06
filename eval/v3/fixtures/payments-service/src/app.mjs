import { buildRoutes } from './handlers/index.mjs';
import { createRouter } from './http/router.mjs';
import { runJob } from './jobs/index.mjs';
import { createLedger } from './store/ledger.mjs';
import { createPaymentStore } from './store/payments.mjs';
import { createEmitter } from './webhooks/emitter.mjs';

export function createApp({ clock = () => new Date(), transport = { send() {} } } = {}) {
  const ctx = {
    clock,
    payments: createPaymentStore({ clock }),
    ledger: createLedger({ clock }),
    emitter: createEmitter({ transport, clock }),
  };
  const router = createRouter(buildRoutes(ctx));
  return { ...ctx, handle: (request) => router.handle(request), runJob: (name) => runJob(name, ctx) };
}
