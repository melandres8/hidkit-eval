import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCents } from '../src/money.mjs';
import { orderTotal, validateLine } from '../src/order.mjs';
import { receipt } from '../src/receipt.mjs';

const lines = [
  { name: 'Bread', priceCents: 250, quantity: 2 },
  { name: 'Milk', priceCents: 129, quantity: 1 },
];

test('formats cents', () => {
  assert.equal(formatCents(629), '6.29');
  assert.equal(formatCents(5), '0.05');
});

test('sums an order', () => {
  assert.equal(orderTotal(lines), 629);
});

test('prints a receipt', () => {
  assert.deepEqual(receipt({ lines }), { lines: [{ name: 'Bread', amount: '5.00' }, { name: 'Milk', amount: '1.29' }], total: '6.29' });
});

test('a quantity of zero is rejected', () => {
  assert.throws(() => validateLine({ name: 'x', priceCents: 100, quantity: 0 }), RangeError);
});
