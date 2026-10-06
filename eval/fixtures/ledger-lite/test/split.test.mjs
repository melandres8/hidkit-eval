import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitBill } from '../src/split.mjs';

test('splits an even bill', () => {
  assert.deepEqual(splitBill(900, 3), [300, 300, 300]);
});
