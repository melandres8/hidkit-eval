import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeGateway, upload } from './helpers.mjs';

test('an upload needs a signed-in user', () => {
  const { gateway } = makeGateway();
  assert.equal(gateway.handle(upload('198.51.100.7', null)).status, 401);
  assert.equal(gateway.handle(upload('198.51.100.7', 'tok-unknown')).status, 401);
});

test('an upload belongs to its user', () => {
  const { gateway } = makeGateway();
  const res = gateway.handle(upload('198.51.100.7', 'tok-a'));
  assert.equal(res.status, 201);
  assert.equal(res.body.owner, 'u_a');
});

test('a user over the upload limit gets 429', () => {
  const { gateway } = makeGateway({ limits: { login: { max: 5, windowSeconds: 60 }, upload: { max: 3, windowSeconds: 60 } } });
  for (let i = 0; i < 3; i += 1) assert.equal(gateway.handle(upload('198.51.100.7', 'tok-a')).status, 201);
  assert.equal(gateway.handle(upload('198.51.100.7', 'tok-a')).status, 429);
});
