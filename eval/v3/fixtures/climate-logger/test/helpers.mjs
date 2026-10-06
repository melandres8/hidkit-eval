import { createApp } from '../src/app.mjs';

export function makeApp() {
  const app = createApp();
  const call = (method, path, body, query) => app.handle({ method, path, body, query });
  const read = (sensor, at, value) => call('POST', '/readings', { sensor, at, value });
  return { app, call, read };
}
