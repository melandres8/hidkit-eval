import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('a payment is created with minor units inside and decimals outside', () => {
  const { app, call } = makeApp();
  const res = call('POST', '/payments', { amount: '12.50', currency: 'USD' });
  assert.equal(res.status, 201);
  assert.equal(res.body.amount, '12.50');
  assert.equal(app.payments.get(res.body.id).amount, 1250);
});

test('a JPY payment has no decimals', () => {
  const { call } = makeApp();
  const res = call('POST', '/payments', { amount: '500', currency: 'JPY' });
  assert.equal(res.body.amount, '500');
});

test('bad input answers with a 4xx status', () => {
  const { call } = makeApp();
  assert.equal(call('POST', '/payments', { amount: 'x', currency: 'USD' }).status, 400);
  assert.equal(call('POST', '/payments', { amount: '1.00', currency: 'ZZZ' }).status, 400);
  assert.equal(call('GET', '/payments/pay_99').status, 404);
});
