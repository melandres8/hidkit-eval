import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

const stored = [
  { sku: 'K-1', name: 'cup', category: 'kitchen', stock: 1 },
  { sku: 'K-2', name: 'bowl', category: 'kitchen', stock: 2 },
  { sku: 'K-3', name: 'plate', category: 'kitchen', stock: 3 },
];

test('a stored list is kept as it is and every SKU is found', () => {
  const { app, call } = makeApp(stored);
  assert.deepEqual(app.snapshot(), stored);
  for (const p of stored) assert.deepEqual(call('GET', `/skus/${p.sku}`).body, p);
});

test('a new product goes into its place in the snapshot', () => {
  const { app, add } = makeApp(stored);
  assert.equal(add('K-0', 'tray').status, 201);
  assert.deepEqual(app.snapshot().map((p) => p.sku), ['K-0', 'K-1', 'K-2', 'K-3']);
});
