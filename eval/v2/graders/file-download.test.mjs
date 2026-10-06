import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';
import { bodyText, defineAttackTests, download, uploadsTree } from './lib/file-download-attacks.mjs';

const { handle } = await import(`${process.env.CANDIDATE_DIR}/src/server.mjs`);
const T = { timeout: 20_000 };

test('an uploaded file downloads with its content', T, async (t) => {
  const { root } = uploadsTree(t);
  const res = await download(handle, root, '/files/a.txt');
  assert.equal(res.status, 200);
  assert.equal(bodyText(res.body), 'hello from a');
});

test('a missing file is not found', T, async (t) => {
  const { root } = uploadsTree(t);
  assert.equal((await download(handle, root, '/files/missing.txt')).status, 404);
});

defineAttackTests(handle);

test('the original tests still pass', T, () => {
  const res = runFrozenTests('uploads-api');
  assert.ok(res.ok, res.output);
});
