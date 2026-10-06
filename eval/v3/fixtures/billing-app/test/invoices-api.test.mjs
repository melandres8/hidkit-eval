import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp, simpleDraft } from './helpers.mjs';

test('a draft is created with computed totals', () => {
  const { call } = makeApp();
  const res = call('POST', '/invoices', simpleDraft());
  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'draft');
  assert.deepEqual(res.body.totals, { subtotal: 2000, tax: 200, total: 2200 });
});

test('bad input answers 400', () => {
  const { call } = makeApp();
  assert.equal(call('POST', '/invoices', { customer: 'X', lines: [] }).status, 400);
  assert.equal(call('POST', '/invoices', simpleDraft({ lines: [{ description: 'x', quantity: 1.5, unitPriceMinor: 100 }] })).status, 400);
  assert.equal(call('POST', '/invoices', simpleDraft({ taxRateBps: -1 })).status, 400);
});

test('an invoice is issued once', () => {
  const { call } = makeApp();
  const { id } = call('POST', '/invoices', simpleDraft()).body;
  const issued = call('POST', `/invoices/${id}/issue`);
  assert.equal(issued.status, 200);
  assert.equal(issued.body.status, 'issued');
  assert.equal(call('POST', `/invoices/${id}/issue`).status, 409);
  assert.equal(call('GET', `/invoices/${id}`).body.totals.total, 2200);
  assert.equal(call('GET', '/invoices/inv-0000-0000').status, 404);
});

test('the stored invoices can be read', () => {
  const { call } = makeApp({ seed: true });
  const res = call('GET', '/invoices/inv-2025-0004');
  assert.equal(res.status, 200);
  assert.equal(res.body.customer, 'Delta Freight');
});
