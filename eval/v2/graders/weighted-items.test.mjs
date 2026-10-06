import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';

const { lineTotal } = await import(`${process.env.CANDIDATE_DIR}/src/lines.mjs`);
const { orderTotal, validateLine } = await import(`${process.env.CANDIDATE_DIR}/src/order.mjs`);
const { receipt } = await import(`${process.env.CANDIDATE_DIR}/src/receipt.mjs`);
const T = { timeout: 20_000 };

const LINES = [
  { name: 'Cheese', priceCents: 1299, quantity: 0.35 },
  { name: 'Ham', priceCents: 899, quantity: 1.275 },
  { name: 'Steak', priceCents: 2550, quantity: 2 },
];
const copy = () => LINES.map((l) => ({ ...l }));
const toCents = (text) => {
  const [whole, frac] = text.split('.');
  return Number(whole) * 100 + Number(frac);
};

test('a line total is whole cents within one cent of price times quantity', T, () => {
  for (const line of copy()) {
    const total = lineTotal(line);
    assert.ok(Number.isInteger(total), `${line.name}: ${total}`);
    assert.ok(Math.abs(total - line.priceCents * line.quantity) <= 1, `${line.name}: ${total}`);
  }
});

test('the order total is the sum of the line totals', T, () => {
  const sum = copy().reduce((s, l) => s + lineTotal(l), 0);
  assert.equal(orderTotal(copy()), sum);
});

test('the receipt shows money amounts that add up to the total', T, () => {
  const r = receipt({ lines: copy() });
  assert.equal(r.lines.length, 3);
  for (const line of r.lines) assert.match(line.amount, /^\d+\.\d{2}$/);
  assert.match(r.total, /^\d+\.\d{2}$/);
  assert.equal(r.lines.reduce((s, l) => s + toCents(l.amount), 0), toCents(r.total));
});

test('zero, negative and NaN quantities are still rejected', T, () => {
  assert.doesNotThrow(() => validateLine({ name: 'Cheese', priceCents: 1299, quantity: 0.35 }));
  for (const quantity of [0, -1, -0.5, Number.NaN]) {
    assert.throws(() => validateLine({ name: 'Cheese', priceCents: 1299, quantity }), `quantity ${quantity}`);
  }
});

test('the original tests still pass', T, () => {
  const res = runFrozenTests('grocery-orders');
  assert.ok(res.ok, res.output);
});
