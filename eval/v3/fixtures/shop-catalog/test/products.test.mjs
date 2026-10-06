import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('a product can be added and read by SKU', () => {
  const { call, add } = makeApp();
  const res = add('K-1', 'cup', 'kitchen', 4);
  assert.equal(res.status, 201);
  assert.deepEqual(call('GET', '/skus/K-1').body, { sku: 'K-1', name: 'cup', category: 'kitchen', stock: 4 });
  assert.equal(call('GET', '/skus/K-2').status, 404);
});

test('the same SKU cannot be added twice', () => {
  const { add } = makeApp();
  assert.equal(add('K-1', 'cup').status, 201);
  assert.equal(add('K-1', 'mug').status, 409);
});

test('a product needs a SKU, a name, a category and a stock count', () => {
  const { add, call } = makeApp();
  assert.equal(add('', 'cup').status, 400);
  assert.equal(add('K-1', ' ').status, 400);
  assert.equal(call('POST', '/products', { sku: 'K-1', name: 'cup', category: 'kitchen', stock: -1 }).status, 400);
  assert.equal(call('POST', '/products', { sku: 'K-1', name: 'cup', category: 'kitchen', stock: 1.5 }).status, 400);
});

test('the product list is sorted by name and can keep one category', () => {
  const { call, add } = makeApp();
  add('K-3', 'plate');
  add('K-1', 'bowl');
  add('G-1', 'rake', 'garden');
  add('K-2', 'cup');
  assert.deepEqual(call('GET', '/products').body.map((p) => p.name), ['bowl', 'cup', 'plate', 'rake']);
  assert.deepEqual(call('GET', '/products', undefined, { category: 'kitchen' }).body.map((p) => p.name), ['bowl', 'cup', 'plate']);
});

test('the category list has each category once, in order', () => {
  const { call, add } = makeApp();
  add('K-1', 'cup', 'kitchen');
  add('G-1', 'rake', 'garden');
  add('K-2', 'bowl', 'kitchen');
  assert.deepEqual(call('GET', '/categories').body, ['garden', 'kitchen']);
});
