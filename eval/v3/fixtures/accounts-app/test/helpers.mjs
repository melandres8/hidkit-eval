import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after } from 'node:test';
import { createApp } from '../src/app.mjs';

const DATA = new URL('../data/users.jsonl', import.meta.url);

// Every test works on a copy, so the files in data/ never change.
export function makeApp({ seed = false, now = '2026-03-01T10:00:00.000Z' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'accounts-'));
  after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const usersFile = path.join(dir, 'users.jsonl');
  if (seed) fs.copyFileSync(DATA, usersFile);
  const clock = { now: new Date(now) };
  const sent = [];
  const app = createApp({ usersFile, clock: () => clock.now, mailer: { send: (message) => sent.push(message) } });
  const call = (method, path, body, query, actor) => app.handle({ method, path, body, query, actor });
  const addUser = (name, handle) => call('POST', '/users', { name, email: `${handle}@example.test`, handle }).body;
  return { app, call, clock, sent, usersFile, addUser };
}
