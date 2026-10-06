import fs from 'node:fs';
import { createGateway } from '../src/gateway.mjs';

export const config = JSON.parse(fs.readFileSync(new URL('../config/gateway.json', import.meta.url), 'utf8'));

export function makeGateway(overrides = {}) {
  const clock = { now: Date.parse('2026-03-01T10:00:00.000Z') };
  const sessions = new Map([['tok-a', { userId: 'u_a' }], ['tok-b', { userId: 'u_b' }]]);
  const gateway = createGateway({ config: { ...config, ...overrides }, clock: () => new Date(clock.now), sessions });
  return { gateway, clock, sessions };
}

export const login = (remoteAddress, headers = {}) => ({
  method: 'POST', path: '/login', remoteAddress, headers, body: { username: 'ada', password: 'wrong' },
});

export const upload = (remoteAddress, token, headers = {}) => ({
  method: 'POST', path: '/uploads', remoteAddress, headers: { ...headers, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: { name: 'a.txt' },
});
