import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capturedPayment, makeApp } from './helpers.mjs';

function table(text) {
  const [header, ...rows] = text.trim().split('\n').map((line) => line.split(','));
  return rows.map((row) => Object.fromEntries(header.map((name, i) => [name, row[i]])));
}

test('the CSV has one row per payment with amounts in major units', () => {
  const { call } = makeApp();
  const usd = capturedPayment(call, '10.00');
  const kwd = capturedPayment(call, '2.500', 'KWD');
  const res = call('GET', '/reports/payments.csv');
  assert.equal(res.status, 200);
  const rows = table(res.body);
  assert.equal(rows.length, 2);
  assert.equal(rows.find((r) => r.id === usd).amount, '10.00');
  assert.equal(rows.find((r) => r.id === kwd).amount, '2.500');
});
