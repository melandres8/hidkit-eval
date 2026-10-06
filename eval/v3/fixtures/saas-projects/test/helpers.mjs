import { createApp } from '../src/app.mjs';

export const ACME = { tenantId: 't_acme', userId: 'u_ann' };
export const BETA = { tenantId: 't_beta', userId: 'u_bob' };

export function makeApp() {
  const app = createApp({ clock: () => new Date('2026-03-01T10:00:00.000Z') });
  const call = (ctx, method, path, body, query) => app.handle({ method, path, body, query, ctx });
  const project = (ctx, name) => call(ctx, 'POST', '/projects', { name }).body;
  const task = (ctx, projectId, title) => call(ctx, 'POST', `/projects/${projectId}/tasks`, { title }).body;
  return { app, call, project, task };
}
