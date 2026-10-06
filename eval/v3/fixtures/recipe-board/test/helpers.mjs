import { createApp } from '../src/app.mjs';

export function makeApp() {
  const sent = [];
  let now = new Date('2026-03-09T10:00:00.000Z');
  const app = createApp({ clock: () => now, mailer: { send: (mail) => sent.push(mail) } });
  const call = (method, path, body, query) => app.handle({ method, path, body, query });
  const post = (recipe) => call('POST', '/api/recipes', { author: 'Ana', ingredients: ['2 eggs'], steps: 'Mix.', tags: [], ...recipe }).body;
  const setNow = (iso) => { now = new Date(iso); };
  return { app, call, post, sent, setNow };
}
