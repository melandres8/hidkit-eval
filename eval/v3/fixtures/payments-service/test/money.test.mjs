import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatAmount, parseAmount } from '../src/money/format.mjs';

test('parseAmount reads the decimals of the currency', () => {
  assert.equal(parseAmount('12.50', 'USD'), 1250);
  assert.equal(parseAmount('1250', 'JPY'), 1250);
  assert.equal(parseAmount('1.250', 'KWD'), 1250);
});

test('parseAmount rejects too many decimals and bad text', () => {
  assert.throws(() => parseAmount('1.5', 'JPY'), RangeError);
  assert.throws(() => parseAmount('1.2345', 'KWD'), RangeError);
  assert.throws(() => parseAmount('abc', 'USD'), RangeError);
});

test('formatAmount pads to the decimals of the currency', () => {
  assert.equal(formatAmount(5, 'USD'), '0.05');
  assert.equal(formatAmount(1250, 'JPY'), '1250');
  assert.equal(formatAmount(1250, 'KWD'), '1.250');
});
