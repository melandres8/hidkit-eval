import { test } from 'node:test';
import assert from 'node:assert/strict';

const { createStore } = await import(`${process.env.CANDIDATE_DIR}/src/store.mjs`);
const { handle } = await import(`${process.env.CANDIDATE_DIR}/src/handler.mjs`);

test('a link with a lifetime redirects until it ends, then answers 410', () => {
  let t = 1_000_000;
  const store = createStore(() => t);
  store.create('a', 'https://example.com', 60);
  t += 59_999;
  assert.deepEqual(handle(store, '/a'), { status: 302, headers: { location: 'https://example.com' } });
  t += 2;
  assert.equal(handle(store, '/a').status, 410);
});

test('a link without a lifetime never expires and unknown codes stay 404', () => {
  let t = 0;
  const store = createStore(() => t);
  store.create('b', 'https://b.example');
  t += 10 ** 12;
  assert.equal(handle(store, '/b').status, 302);
  assert.equal(handle(store, '/zzz').status, 404);
});
