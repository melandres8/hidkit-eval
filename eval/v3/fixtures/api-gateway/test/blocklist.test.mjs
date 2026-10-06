import { test } from 'node:test';
import assert from 'node:assert/strict';
import { login, makeGateway, upload } from './helpers.mjs';

test('a blocked address is refused', () => {
  const { gateway } = makeGateway();
  assert.equal(gateway.handle(login('203.0.113.66')).status, 403);
  assert.equal(gateway.handle({ method: 'GET', path: '/health', remoteAddress: '203.0.113.66', headers: {} }).status, 403);
});

test('a blocked address is refused even with a valid session', () => {
  const { gateway } = makeGateway();
  assert.equal(gateway.handle(upload('203.0.113.66', 'tok-a')).status, 403);
});

test('a range on the blocklist blocks every address in it', () => {
  const { gateway } = makeGateway({ blocklist: ['198.51.100.0/24'] });
  assert.equal(gateway.handle(login('198.51.100.200')).status, 403);
  assert.equal(gateway.handle(login('198.51.101.1')).status, 401);
});
