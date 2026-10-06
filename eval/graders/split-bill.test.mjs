import { test } from 'node:test';
import assert from 'node:assert/strict';

const { splitBill } = await import(`${process.env.CANDIDATE_DIR}/src/split.mjs`);

test('shares add up to the total and differ by at most one cent', () => {
  for (const total of [0, 1, 2, 99, 100, 1000, 10000, 12345, 99999]) {
    for (const people of [1, 2, 3, 4, 6, 7, 9]) {
      const shares = splitBill(total, people);
      assert.equal(shares.length, people);
      assert.ok(shares.every(Number.isInteger));
      assert.equal(shares.reduce((a, b) => a + b, 0), total);
      assert.ok(Math.max(...shares) - Math.min(...shares) <= 1);
    }
  }
});

test('invalid input still throws RangeError', () => {
  assert.throws(() => splitBill(-1, 2), RangeError);
  assert.throws(() => splitBill(100, 0), RangeError);
});
