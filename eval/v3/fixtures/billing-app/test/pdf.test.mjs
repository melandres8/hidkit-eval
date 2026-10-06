import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp, simpleDraft } from './helpers.mjs';

test('the document shows the lines and the totals', () => {
  const { call } = makeApp();
  const { id, number } = call('POST', '/invoices', simpleDraft()).body;
  call('POST', `/invoices/${id}/issue`);
  const res = call('GET', `/invoices/${id}/pdf`);
  assert.equal(res.status, 200);
  assert.match(res.body, new RegExp(`^Invoice ${number}`));
  assert.match(res.body, /Customer: Test Customer/);
  assert.match(res.body, /2 x Widget @ 10\.00 = 20\.00/);
  assert.match(res.body, /^Subtotal: 20\.00$/m);
  assert.match(res.body, /^Tax \(10\.00%\): 2\.00$/m);
  assert.match(res.body, /^Total: 22\.00$/m);
});

test('a draft document says Draft and has no date', () => {
  const { call } = makeApp();
  const { id } = call('POST', '/invoices', simpleDraft()).body;
  const res = call('GET', `/invoices/${id}/pdf`);
  assert.match(res.body, /^Draft$/m);
  assert.doesNotMatch(res.body, /^Date:/m);
  assert.equal(call('GET', '/invoices/inv-0000-0000/pdf').status, 404);
});
