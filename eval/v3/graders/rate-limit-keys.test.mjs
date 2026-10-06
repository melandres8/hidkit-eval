import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';
import { CONFIG, assertOneBucket, defineAttackTests, makeGateway } from './lib/rate-limit-keys-attacks.mjs';

const { createGateway } = await import(`${process.env.CANDIDATE_DIR}/src/gateway.mjs`);
const T = { timeout: 20_000 };

const sessions = () => new Map([['tok-a', { userId: 'u_a' }], ['tok-b', { userId: 'u_b' }]]);
const upload = (gateway, token, remoteAddress, headers = {}) => gateway.handle({
  method: 'POST', path: '/uploads', remoteAddress, headers: { ...headers, authorization: `Bearer ${token}` }, body: { name: 'a.txt' },
});

test('signed-in requests are keyed by user id', T, () => {
  // Two users share one address. One user can use up the limit without blocking the other.
  for (const [remote, headers] of [['198.51.100.7', {}], ['10.0.0.5', { 'x-forwarded-for': '203.0.113.9' }]]) {
    const { gateway } = makeGateway(createGateway, sessions());
    const max = CONFIG.limits.upload.max;
    for (let i = 0; i < max; i += 1) assert.equal(upload(gateway, 'tok-a', remote, headers).status, 201, `${remote} user a request ${i + 1}`);
    assert.equal(upload(gateway, 'tok-a', remote, headers).status, 429, `${remote} user a is over the limit`);
    assert.equal(upload(gateway, 'tok-b', remote, headers).status, 201, `${remote} user b is not blocked by user a`);
  }
});

test('a user keeps one limit when the address changes', T, () => {
  const { gateway } = makeGateway(createGateway, sessions());
  const max = CONFIG.limits.upload.max;
  for (let i = 0; i < max; i += 1) assert.equal(upload(gateway, 'tok-a', `198.51.100.${10 + i}`).status, 201);
  assert.equal(upload(gateway, 'tok-a', '198.51.100.99').status, 429);
});

test('anonymous requests behind a trusted proxy are keyed by the first untrusted address', T, () => {
  const { login } = makeGateway(createGateway);
  const max = CONFIG.limits.login.max;
  // Client X uses up its limit. Client Y behind the same proxy is not blocked.
  assertOneBucket(login, '10.0.0.5', Array(max + 2).fill('203.0.113.10'));
  assert.equal(login('10.0.0.5', '203.0.113.11').status, 401);
  // The proxy may sit behind another proxy. Trusted addresses at the right end do not count.
  assertOneBucket(login, '10.0.0.5', Array(max + 1).fill('9.9.9.9, 203.0.113.13, 10.0.0.9'));
  assert.equal(login('10.0.0.5', '9.9.9.9, 203.0.113.14, 10.0.0.9').status, 401);
  assertOneBucket(login, '10.0.0.6', Array(max + 1).fill('203.0.113.15, 10.0.0.9, 10.0.0.8'));
  // A proxy in the list by single address works as well.
  assertOneBucket(login, '192.168.1.1', Array(max + 1).fill('203.0.113.16'));
  assert.equal(login('192.168.1.1', '203.0.113.17').status, 401);
});

test('a spoofed header from an untrusted address does not change the key', T, () => {
  const { login } = makeGateway(createGateway);
  // Requests with and without the header share the bucket of the connection address.
  assert.equal(login('198.51.100.7').status, 401);
  assert.equal(login('198.51.100.7', '1.1.1.1').status, 401);
  assert.equal(login('198.51.100.7', '2.2.2.2').status, 401);
  assert.equal(login('198.51.100.7').status, 429);
  // Another address has its own bucket.
  assert.equal(login('198.51.100.8', '1.1.1.1').status, 401);
});

test('the blocklist and the audit log keep the address of the connection', T, () => {
  const config = { ...CONFIG, blocklist: ['203.0.113.66'] };
  const clock = () => new Date('2026-03-01T10:00:00.000Z');
  const gateway = createGateway({ config, clock, sessions: sessions() });
  // A signed-in user and a client behind a trusted proxy: the log shows the connection address.
  upload(gateway, 'tok-a', '198.51.100.7');
  gateway.handle({ method: 'POST', path: '/login', remoteAddress: '10.0.0.5', headers: { 'x-forwarded-for': '203.0.113.9' }, body: {} });
  assert.deepEqual(gateway.audit.entries().map((e) => e.address), ['198.51.100.7', '10.0.0.5']);
  // The blocklist does not read the header: a proxy that carries a listed client is not blocked.
  assert.notEqual(gateway.handle({ method: 'POST', path: '/login', remoteAddress: '10.0.0.5', headers: { 'x-forwarded-for': '203.0.113.66' }, body: {} }).status, 403);
  // A listed connection is still blocked, signed in or not.
  assert.equal(upload(gateway, 'tok-a', '203.0.113.66').status, 403);
});

defineAttackTests({ createGateway });

test('the original tests still pass', T, () => {
  const res = runFrozenTests('api-gateway');
  assert.ok(res.ok, res.output);
});
