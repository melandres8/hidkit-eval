import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceCart } from '../src/index.mjs';

test('prices a cart with tax', () => {
  assert.deepEqual(priceCart([{ priceCents: 1000, quantity: 2 }]), { subtotal: 2000, discount: 0, tax: 380, total: 2380 });
});

test('applies a percent coupon before the tax', () => {
  assert.deepEqual(priceCart([{ priceCents: 1000, quantity: 1 }], { percent: 10 }), { subtotal: 1000, discount: 100, tax: 171, total: 1071 });
});
