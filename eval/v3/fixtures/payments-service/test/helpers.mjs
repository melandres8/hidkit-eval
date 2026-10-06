import { createApp } from '../src/app.mjs';

export function makeApp() {
  const events = [];
  const app = createApp({ clock: () => new Date('2026-03-01T10:00:00Z'), transport: { send: (event) => events.push(event) } });
  const call = (method, path, body, query) => app.handle({ method, path, body, query });
  return { app, events, call };
}

export function capturedPayment(call, amount = '10.00', currency = 'USD') {
  const created = call('POST', '/payments', { amount, currency });
  call('POST', `/payments/${created.body.id}/captures`);
  return created.body.id;
}
