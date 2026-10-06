import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runFrozenTests } from './lib/frozen.mjs';
import { bundles, defineAttackTests, expectRejected, makeEnv, previews, reads, writes, SECRET } from './lib/file-vault-attacks.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);
const T = { timeout: 20_000 };
const BASIC = ['../secrets/token.txt', '../../outside.txt', 'reports/../../secrets/token.txt'];

test('a download, an upload and a delete reject a name that leaves the files folder', T, () => {
  const env = makeEnv(createApp);
  try {
    for (const name of BASIC) {
      for (const [label, action] of [...reads(env, name), ...writes(env, name)]) expectRejected(env, label, action);
    }
    assert.equal(fs.readFileSync(path.join(env.root, 'secrets', 'token.txt'), 'utf8'), SECRET);
    assert.equal(env.call('GET', '/files/a.txt').body.content, 'alpha');
  } finally {
    env.cleanup();
  }
});

test('a preview rejects a name that leaves the files folder, and writes no cache file outside previews', T, () => {
  const env = makeEnv(createApp);
  try {
    for (const name of BASIC) {
      for (const [label, action] of previews(env, name)) expectRejected(env, label, action);
    }
    assert.equal(env.call('GET', '/previews/a.txt').body.text, 'alpha');
  } finally {
    env.cleanup();
  }
});

test('a bundle rejects a file name or a bundle name that leaves its folder, and writes nothing', T, () => {
  const env = makeEnv(createApp);
  try {
    for (const name of BASIC) {
      for (const [label, action] of bundles(env, name)) expectRejected(env, label, action);
    }
    assert.deepEqual(fs.readdirSync(path.join(env.root, 'bundles')), []);
    assert.equal(env.call('POST', '/bundles', { name: 'ok', files: ['a.txt'] }).status, 201);
  } finally {
    env.cleanup();
  }
});

test('names that only look odd still work on every path', T, () => {
  const env = makeEnv(createApp);
  try {
    const names = ['a..b.txt', '..hidden', 'my notes (1).txt', 'reports/2026/q2.txt', 'ünï.txt'];
    for (const name of names) {
      const form = encodeURI(name);
      const base = encodeURIComponent(name).replace(/%2F/g, '/');
      assert.equal(env.call('PUT', `/files/${form}`, { content: `body of ${name}` }).status, 200, `upload ${name}`);
      assert.equal(env.call('GET', `/files/${base}`).body.content, `body of ${name}`, `download ${name}`);
      assert.equal(env.call('GET', `/previews/${base}`).body.text, `body of ${name}`, `preview ${name}`);
      assert.ok(fs.existsSync(path.join(env.root, 'previews', `${name}.preview`)), `cache of ${name}`);
      const bundle = env.call('POST', '/bundles', { name: `pack-${name}`, files: [name, 'a.txt'] });
      assert.equal(bundle.status, 201, `bundle ${name}`);
      assert.ok(fs.readFileSync(path.join(env.root, 'bundles', `pack-${name}.bundle`), 'utf8').includes(`== ${name} ==\nbody of ${name}\n`));
    }
    assert.equal(env.call('POST', '/bundles', { name: 'archive/2026/week', files: ['a.txt'] }).status, 201);
    assert.ok(fs.existsSync(path.join(env.root, 'bundles', 'archive', '2026', 'week.bundle')));
    assert.equal(env.call('GET', '/folders/reports').status, 200);
    for (const name of names) assert.equal(env.call('DELETE', `/files/${encodeURI(name)}`).status, 200, `delete ${name}`);
  } finally {
    env.cleanup();
  }
});

defineAttackTests({ createApp });

test('the original tests still pass', T, () => {
  const res = runFrozenTests('file-vault');
  assert.ok(res.ok, res.output);
});
