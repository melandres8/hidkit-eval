import { test } from 'node:test';
import assert from 'node:assert/strict';
import { login, makeGateway, upload } from './helpers.mjs';

test('the audit log has one entry per request with the address of the caller', () => {
  const { gateway } = makeGateway();
  gateway.handle(login('198.51.100.7'));
  gateway.handle(upload('198.51.100.9', 'tok-a'));
  gateway.handle({ method: 'GET', path: '/nothing', remoteAddress: '198.51.100.7', headers: {} });
  const entries = gateway.audit.entries();
  assert.deepEqual(entries.map((e) => [e.path, e.status, e.address]), [
    ['/login', 401, '198.51.100.7'], ['/uploads', 201, '198.51.100.9'], ['/nothing', 404, '198.51.100.7'],
  ]);
  assert.equal(entries[0].at, '2026-03-01T10:00:00.000Z');
});

test('a blocked request is logged with the blocked address', () => {
  const { gateway } = makeGateway();
  gateway.handle(login('203.0.113.66'));
  assert.deepEqual(gateway.audit.entries().map((e) => [e.status, e.address]), [[403, '203.0.113.66']]);
});
