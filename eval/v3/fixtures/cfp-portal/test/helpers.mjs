import { createApp } from '../src/app.mjs';

export const ANA = { role: 'speaker', speakerId: 'sp-ana' };
export const BEN = { role: 'speaker', speakerId: 'sp-ben' };
export const ORG = { role: 'organizer' };

export function makeApp() {
  const app = createApp({ clock: () => new Date('2026-04-01T09:00:00.000Z') });
  const as = (caller) => (method, path, body) => app.handle({ method, path, body, caller });
  const propose = (caller, extra = {}) => as(caller)('POST', '/talks', { title: 'Small tools', abstract: 'About tools.', track: 'web', level: 'intro', ...extra }).body;
  return { app, as, propose };
}
