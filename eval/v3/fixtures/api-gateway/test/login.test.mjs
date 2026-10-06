import { test } from 'node:test';
import assert from 'node:assert/strict';
import { login, makeGateway } from './helpers.mjs';

test('a wrong password answers 401 and a right one gives a token', () => {
  const { gateway } = makeGateway();
  assert.equal(gateway.handle(login('198.51.100.7')).status, 401);
  const res = gateway.handle({ method: 'POST', path: '/login', remoteAddress: '198.51.100.7', headers: {}, body: { username: 'ada', password: 'swordfish' } });
  assert.equal(res.status, 200);
  assert.match(res.body.token, /^tok_/);
});

test('the sixth login attempt in a minute is refused', () => {
  const { gateway } = makeGateway();
  for (let i = 0; i < 5; i += 1) assert.equal(gateway.handle(login('198.51.100.7')).status, 401);
  const res = gateway.handle(login('198.51.100.7'));
  assert.equal(res.status, 429);
  assert.ok(Number(res.headers['retry-after']) > 0);
});

test('the login limit resets after the window', () => {
  const { gateway, clock } = makeGateway();
  for (let i = 0; i < 6; i += 1) gateway.handle(login('198.51.100.7'));
  clock.now += 61_000;
  assert.equal(gateway.handle(login('198.51.100.7')).status, 401);
});

test('two addresses have separate login limits', () => {
  const { gateway } = makeGateway();
  for (let i = 0; i < 6; i += 1) gateway.handle(login('198.51.100.7'));
  assert.equal(gateway.handle(login('198.51.100.8')).status, 401);
});
