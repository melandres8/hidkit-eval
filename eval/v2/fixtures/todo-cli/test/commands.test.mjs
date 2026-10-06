import { test } from 'node:test';
import assert from 'node:assert/strict';
import { add, list } from '../src/commands.mjs';

const todos = () => [
  { id: 1, title: 'Buy milk', done: false },
  { id: 2, title: 'Call Ana', done: true },
];

test('list shows each todo with its state', () => {
  assert.deepEqual(list(todos()), ['[ ] 1. Buy milk', '[x] 2. Call Ana']);
});

test('list says when there is nothing to show', () => {
  assert.deepEqual(list([]), ['No todos.']);
});

test('add gives the next id', () => {
  const t = todos();
  assert.deepEqual(add(t, 'Pay rent'), ['Added 3. Pay rent']);
  assert.equal(t[2].id, 3);
});
