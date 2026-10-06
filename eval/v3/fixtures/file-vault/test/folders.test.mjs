import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveInside } from '../src/storage/paths.mjs';
import { makeApp } from './helpers.mjs';

test('a folder lists its entries', () => {
  const { call, put } = makeApp();
  put('reports/2026/q1.txt', 'q1');
  put('reports/summary.txt', 's');
  assert.deepEqual(call('GET', '/folders/reports').body, { folder: 'reports', entries: ['2026/', 'summary.txt'] });
  assert.equal(call('GET', '/folders/none').status, 404);
});

test('a folder name that leaves the files folder gets 400', () => {
  const { call } = makeApp();
  assert.equal(call('GET', '/folders/..').status, 400);
  assert.equal(call('GET', '/folders/../bundles').status, 400);
  assert.equal(call('GET', '/folders/%2e%2e%2fbundles').status, 400);
});

test('resolveInside accepts names that only look odd', () => {
  assert.equal(resolveInside('/base', 'a..b.txt'), '/base/a..b.txt');
  assert.equal(resolveInside('/base', '..hidden'), '/base/..hidden');
  assert.equal(resolveInside('/base', 'x/../y.txt'), '/base/y.txt');
  for (const bad of ['', '..', '../x', '/etc/passwd', 'a\\b', 'a\0b']) assert.throws(() => resolveInside('/base', bad), { status: 400 });
});
