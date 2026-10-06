import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeApp } from './helpers.mjs';

test('a file can be written, read, listed and removed', () => {
  const { root, call, put } = makeApp();
  assert.equal(put('notes.txt', 'hello').status, 200);
  assert.deepEqual(call('GET', '/files/notes.txt').body, { name: 'notes.txt', content: 'hello' });
  assert.deepEqual(call('GET', '/files').body, { files: ['notes.txt'] });
  assert.equal(fs.readFileSync(path.join(root, 'files', 'notes.txt'), 'utf8'), 'hello');
  assert.deepEqual(call('DELETE', '/files/notes.txt').body, { removed: 'notes.txt' });
  assert.equal(call('GET', '/files/notes.txt').status, 404);
  assert.equal(call('DELETE', '/files/notes.txt').status, 404);
});

test('a name can hold folders', () => {
  const { call, put } = makeApp();
  assert.equal(put('reports/2026/q1.txt', 'q1').status, 200);
  put('reports/2026/q2.txt', 'q2');
  put('top.txt', 'top');
  assert.deepEqual(call('GET', '/files').body.files, ['reports/2026/q1.txt', 'reports/2026/q2.txt', 'top.txt']);
  assert.equal(call('GET', '/files/reports/2026/q1.txt').body.content, 'q1');
});

test('a route part is decoded once', () => {
  const { call, put } = makeApp();
  put('my notes.txt', 'spaced');
  assert.equal(call('GET', '/files/my%20notes.txt').body.content, 'spaced');
  assert.equal(call('GET', '/files/my%2520notes.txt').status, 404);
});

test('the content must be a string of at most 1 000 000 bytes', () => {
  const { put } = makeApp();
  assert.equal(put('a.txt', 42).status, 400);
  assert.equal(put('big.txt', 'x'.repeat(1_000_001)).status, 413);
  assert.equal(put('ok.txt', 'x'.repeat(1_000_000)).status, 200);
});

test('a missing file is a 404 and a folder is not a file', () => {
  const { call, put } = makeApp();
  put('dir/a.txt', 'a');
  assert.equal(call('GET', '/files/none.txt').status, 404);
  assert.equal(call('GET', '/files/dir').status, 404);
});
