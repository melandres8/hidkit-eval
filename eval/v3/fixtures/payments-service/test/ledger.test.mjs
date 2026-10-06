import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capturedPayment, makeApp } from './helpers.mjs';

test('a capture is an entry and moves the balance', () => {
  const { app, call } = makeApp();
  const id = capturedPayment(call, '10.00');
  const entries = app.ledger.entries({ paymentId: id });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].amount, 1000);
  assert.equal(app.ledger.balance('USD'), 1000);
});

test('the balance route shows the balance of one currency', () => {
  const { call } = makeApp();
  capturedPayment(call, '10.00');
  capturedPayment(call, '700', 'JPY');
  assert.equal(call('GET', '/ledger/balance', undefined, { currency: 'USD' }).body.balance, '10.00');
  assert.equal(call('GET', '/ledger/balance', undefined, { currency: 'JPY' }).body.balance, '700');
});
