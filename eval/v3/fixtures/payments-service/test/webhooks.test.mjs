import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capturedPayment, makeApp } from './helpers.mjs';

test('a capture sends one event with minor units', () => {
  const { events, call } = makeApp();
  const id = capturedPayment(call, '10.00');
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'payment.captured');
  assert.equal(events[0].data.id, id);
  assert.equal(events[0].data.amount, 1000);
  assert.equal(events[0].createdAt, '2026-03-01T10:00:00.000Z');
});
