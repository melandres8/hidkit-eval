import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/store.mjs';
import { handle } from '../src/handler.mjs';

test('redirects a known code', () => {
  const store = createStore();
  store.create('a', 'https://example.com');
  assert.deepEqual(handle(store, '/a'), { status: 302, headers: { location: 'https://example.com' } });
});

test('answers 404 for an unknown code', () => {
  assert.equal(handle(createStore(), '/zzz').status, 404);
});
