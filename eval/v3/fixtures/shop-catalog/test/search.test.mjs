import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('a search finds a part of the name and ignores case', () => {
  const { call, add } = makeApp();
  add('K-1', 'blue cup');
  add('K-2', 'red cup');
  add('K-3', 'plate');
  const res = call('GET', '/search', undefined, { q: 'CUP' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.products.map((p) => p.name), ['blue cup', 'red cup']);
});

test('a search with no text gets 400', () => {
  const { call } = makeApp();
  assert.equal(call('GET', '/search', undefined, {}).status, 400);
  assert.equal(call('GET', '/search', undefined, { q: '  ' }).status, 400);
});
