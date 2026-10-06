import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createJobStore } from '../src/store/jobs.mjs';

test('the store keeps a copy of each job', () => {
  const store = createJobStore();
  const input = { id: 'a', time: '09:00', zone: 'Europe/Berlin' };
  store.add(input);
  input.time = '10:00';
  assert.equal(store.get('a').time, '09:00');
  assert.equal(store.list().length, 1);
  assert.equal(store.get('missing'), null);
});
