import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('the export has a header and one row for each product', () => {
  const { app, call, add } = makeApp();
  add('K-2', 'plate', 'kitchen', 7);
  add('K-1', 'cup, tall', 'kitchen', 3);
  const res = call('POST', '/exports');
  assert.equal(res.status, 201);
  assert.deepEqual(res.body.csv.trim().split('\n'), ['sku,name,category,stock', 'K-1,"cup, tall",kitchen,3', 'K-2,plate,kitchen,7']);
  assert.equal(app.runJob('export-catalog').filename, 'catalog-2026-03-01.csv');
});

test('a name that starts like a formula is exported as text', () => {
  const { call, add } = makeApp();
  add('K-1', '=1+1');
  assert.ok(call('POST', '/exports').body.csv.includes("K-1,'=1+1,"));
});
