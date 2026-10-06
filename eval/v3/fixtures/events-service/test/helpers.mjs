import { createApp } from '../src/app.mjs';

// A clock that tests move by hand, and a transport that records each request.
// `reply` decides the answer for a request. It returns a status, or throws to simulate a network error.
export function makeApp({ reply = () => 200 } = {}) {
  const clock = { now: new Date('2026-03-01T10:00:00.000Z') };
  const sent = [];
  const transport = {
    async send(request) {
      sent.push({ ...request, at: clock.now.getTime() });
      return { status: reply(request, sent.length) };
    },
  };
  const app = createApp({ clock: () => clock.now, transport });
  const call = (method, path, body) => app.handle({ method, path, body });
  const advance = (ms) => { clock.now = new Date(clock.now.getTime() + ms); };
  return { app, call, clock, sent, advance };
}
