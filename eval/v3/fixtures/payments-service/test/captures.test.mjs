import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('a capture sets the status and the captured amount', () => {
  const { call } = makeApp();
  const id = call('POST', '/payments', { amount: '10.00', currency: 'USD' }).body.id;
  const res = call('POST', `/payments/${id}/captures`);
  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'captured');
  assert.equal(res.body.capturedAmount, '10.00');
});

test('a payment cannot be captured twice', () => {
  const { call } = makeApp();
  const id = call('POST', '/payments', { amount: '10.00', currency: 'USD' }).body.id;
  call('POST', `/payments/${id}/captures`);
  assert.equal(call('POST', `/payments/${id}/captures`).status, 409);
});
