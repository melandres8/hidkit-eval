import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('prune-events removes events older than 7 days', async () => {
  const { app, call, advance } = makeApp();
  const old = (await call('POST', '/events', { type: 'ping', data: {} })).body;
  advance(8 * 24 * 60 * 60 * 1000);
  const fresh = (await call('POST', '/events', { type: 'ping', data: {} })).body;
  await app.runJob('prune-events');
  assert.equal((await call('GET', `/events/${old.id}`)).status, 404);
  assert.equal((await call('GET', `/events/${fresh.id}`)).status, 200);
});

test('an unknown job name throws', () => {
  const { app } = makeApp();
  assert.throws(() => app.runJob('nope'), /unknown job/);
});
