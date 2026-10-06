import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeApp } from './helpers.mjs';

test('a bundle holds the listed files in order', () => {
  const { root, call, put } = makeApp();
  put('a.txt', 'alpha');
  put('docs/b.txt', 'beta');
  const res = call('POST', '/bundles', { name: 'week-1', files: ['docs/b.txt', 'a.txt'] });
  assert.equal(res.status, 201);
  assert.deepEqual(res.body, { bundle: 'week-1.bundle', files: 2 });
  assert.equal(fs.readFileSync(path.join(root, 'bundles', 'week-1.bundle'), 'utf8'), '== docs/b.txt ==\nbeta\n== a.txt ==\nalpha\n');
});

test('a missing file stops the bundle and nothing is written', () => {
  const { root, call, put } = makeApp();
  put('a.txt', 'alpha');
  assert.equal(call('POST', '/bundles', { name: 'x', files: ['a.txt', 'gone.txt'] }).status, 404);
  assert.deepEqual(fs.readdirSync(path.join(root, 'bundles')), []);
});

test('the name and the list are checked', () => {
  const { call, put } = makeApp();
  put('a.txt', 'alpha');
  assert.equal(call('POST', '/bundles', { files: ['a.txt'] }).status, 400);
  assert.equal(call('POST', '/bundles', { name: 'x', files: [] }).status, 400);
  assert.equal(call('POST', '/bundles', { name: 'x', files: 'a.txt' }).status, 400);
  assert.equal(call('POST', '/bundles', { name: 'x', files: Array(51).fill('a.txt') }).status, 400);
});

test('the job runs by name', () => {
  const { app, put } = makeApp();
  put('a.txt', 'alpha');
  assert.deepEqual(app.runJob('build-bundle', { name: 'solo', files: ['a.txt'] }), { bundle: 'solo.bundle', files: 1 });
});
