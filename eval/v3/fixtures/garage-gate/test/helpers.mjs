import { createApp } from '../src/app.mjs';

export function makeApp({ passes = [], now = '2026-05-04T08:30:00.000Z' } = {}) {
  const app = createApp({ passes, clock: () => new Date(now) });
  const call = (method, path, body, query) => app.handle({ method, path, body, query });
  const read = (plate, camera = 'gate-1') => call('POST', '/camera', { camera, plate }).body;
  return { app, call, read };
}
