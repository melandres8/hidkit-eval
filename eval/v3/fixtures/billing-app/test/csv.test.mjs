import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp, simpleDraft } from './helpers.mjs';

function table(text) {
  const [header, ...rows] = text.trim().split('\n').map((line) => line.split(','));
  return rows.map((row) => Object.fromEntries(header.map((name, i) => [name, row[i]])));
}

test('the CSV has one row for each invoice with amounts in major units', () => {
  const { call } = makeApp();
  const first = call('POST', '/invoices', simpleDraft()).body;
  call('POST', '/invoices', simpleDraft({ customer: 'Second Customer', taxRateBps: 0 }));
  const res = call('GET', '/exports/invoices.csv');
  assert.equal(res.status, 200);
  const rows = table(res.body);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { number: first.number, customer: 'Test Customer', currency: 'USD', subtotal: '20.00', tax: '2.00', total: '22.00' });
  assert.equal(rows[1].tax, '0.00');
});

test('a customer name with a comma is quoted', () => {
  const { call } = makeApp();
  call('POST', '/invoices', simpleDraft({ customer: 'Acme, Inc.' }));
  assert.match(call('GET', '/exports/invoices.csv').body, /"Acme, Inc."/);
});
