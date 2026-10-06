import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCheckout } from '../src/checkout.mjs';
import { createFakeGateway } from '../src/fake-gateway.mjs';
import { createStore } from '../src/store.mjs';

test('a checkout charges the card', async () => {
  const gateway = createFakeGateway();
  const checkout = createCheckout({ gateway, store: createStore() });
  const result = await checkout({ idempotencyKey: 'k1', amountCents: 500, cardToken: 'tok' });
  assert.equal(result.chargeId, 'ch_1');
  assert.equal(gateway.calls.length, 1);
});

test('a retry after completion returns the first result', async () => {
  const gateway = createFakeGateway();
  const checkout = createCheckout({ gateway, store: createStore() });
  const first = await checkout({ idempotencyKey: 'k1', amountCents: 500, cardToken: 'tok' });
  const again = await checkout({ idempotencyKey: 'k1', amountCents: 500, cardToken: 'tok' });
  assert.deepEqual(again, first);
  assert.equal(gateway.calls.length, 1);
});
