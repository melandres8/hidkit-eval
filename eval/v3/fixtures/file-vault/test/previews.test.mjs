import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeApp } from './helpers.mjs';

test('a preview is the first 200 characters with white space cut to one space', () => {
  const { call, put } = makeApp();
  put('long.txt', `line one\n\n   line two\t${'x'.repeat(400)}`);
  const res = call('GET', '/previews/long.txt');
  assert.equal(res.status, 200);
  assert.equal(res.body.text.length, 200);
  assert.ok(res.body.text.startsWith('line one line two xxx'));
});

test('a preview is kept in the previews folder', () => {
  const { root, call, put } = makeApp();
  put('reports/q1.txt', 'quarter one');
  call('GET', '/previews/reports/q1.txt');
  assert.equal(fs.readFileSync(path.join(root, 'previews', 'reports', 'q1.txt.preview'), 'utf8'), 'quarter one');
});

test('a missing file has no preview', () => {
  const { call } = makeApp();
  assert.equal(call('GET', '/previews/none.txt').status, 404);
});

test('the job clean-previews removes the cached previews', () => {
  const { app, call, put } = makeApp();
  put('a.txt', 'a');
  put('b/c.txt', 'c');
  call('GET', '/previews/a.txt');
  call('GET', '/previews/b/c.txt');
  assert.deepEqual(app.runJob('clean-previews'), { removed: 2 });
  assert.deepEqual(app.runJob('clean-previews'), { removed: 0 });
});
