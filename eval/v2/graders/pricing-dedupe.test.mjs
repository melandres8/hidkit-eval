import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runFrozenTests } from './lib/frozen.mjs';

const SRC = path.join(process.env.CANDIDATE_DIR, 'src');
const { invoiceTotal, priceCart } = await import(`${SRC}/index.mjs`);
const T = { timeout: 20_000 };

// Frozen copies of the original functions.
function originalPriceCart(items, coupon = null) {
  const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const percent = coupon ? coupon.percent : 0;
  const discount = Math.round((subtotal * percent) / 100);
  const tax = Math.round((subtotal - discount) * 0.19);
  return { subtotal, discount, tax, total: subtotal - discount + tax };
}

function originalInvoiceTotal(order) {
  const subtotal = order.lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
  const percent = order.coupon ? order.coupon.percent : 0;
  const discount = Math.round((subtotal * percent) / 100);
  const tax = order.lines.reduce((sum, line) => sum + Math.round(((line.priceCents * line.quantity * (100 - percent)) / 100) * 0.19), 0);
  return { subtotal, discount, tax, total: subtotal - discount + tax };
}

// mulberry32: a small seeded PRNG, so every run checks the same 500 orders.
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function orders() {
  const rand = prng(20261004);
  const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  return Array.from({ length: 500 }, () => {
    const lines = Array.from({ length: int(1, 6) }, () => ({ priceCents: int(1, 99999), quantity: int(1, 5) }));
    const percent = int(0, 50);
    return { lines, coupon: percent === 0 ? null : { percent } };
  });
}

test('the cart price is unchanged on 500 orders', T, () => {
  for (const order of orders()) {
    const items = order.lines.map((l) => ({ ...l }));
    assert.deepEqual(priceCart(items, order.coupon && { ...order.coupon }), originalPriceCart(items, order.coupon), JSON.stringify(order));
  }
});

test('the invoice total is unchanged on 500 orders', T, () => {
  for (const order of orders()) {
    const copy = { lines: order.lines.map((l) => ({ ...l })), coupon: order.coupon && { ...order.coupon } };
    assert.deepEqual(invoiceTotal(copy), originalInvoiceTotal(order), JSON.stringify(order));
  }
});

const sourceFiles = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => /\.[cm]?js$/.test(f)).map((f) => path.join(dir, f));
const relativeImports = (file) => [...fs.readFileSync(file, 'utf8').matchAll(/(?:import|export)\s[^'"]*?from\s*['"](\.[^'"]+)['"]/g)]
  .map((m) => path.resolve(path.dirname(file), m[1]));

test('the tax rate is written in one file only', T, () => {
  const withRate = sourceFiles(SRC).filter((f) => fs.readFileSync(f, 'utf8').includes('0.19'));
  assert.ok(withRate.length <= 1, `0.19 appears in ${withRate.map((f) => path.relative(SRC, f)).join(', ')}`);
});

test('the cart and the invoice import one shared module', T, () => {
  const cart = relativeImports(path.join(SRC, 'cart.mjs'));
  const invoice = relativeImports(path.join(SRC, 'invoice.mjs'));
  const shared = cart.filter((f) => invoice.includes(f) && f.startsWith(SRC + path.sep) && fs.existsSync(f));
  assert.ok(shared.length >= 1, 'no module under src/ is imported by both cart.mjs and invoice.mjs');
});

test('the original tests still pass', T, () => {
  const res = runFrozenTests('shop-pricing');
  assert.ok(res.ok, res.output);
});
