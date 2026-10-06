import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMinor } from '../src/money/format.mjs';
import { computeTotals } from '../src/billing/totals.mjs';

test('formatMinor writes two decimals', () => {
  assert.equal(formatMinor(5), '0.05');
  assert.equal(formatMinor(1234), '12.34');
  assert.equal(formatMinor(100000), '1000.00');
});

test('computeTotals adds the lines and the tax', () => {
  const totals = computeTotals({ taxRateBps: 1000, lines: [{ quantity: 2, unitPriceMinor: 1000 }, { quantity: 1, unitPriceMinor: 500 }] });
  assert.deepEqual(totals, { subtotal: 2500, tax: 250, total: 2750 });
});

test('an invoice without tax has no tax in the totals', () => {
  assert.deepEqual(computeTotals({ taxRateBps: 0, lines: [{ quantity: 3, unitPriceMinor: 200 }] }), { subtotal: 600, tax: 0, total: 600 });
});
