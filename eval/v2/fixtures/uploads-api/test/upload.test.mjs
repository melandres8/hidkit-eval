import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { handle } from '../src/server.mjs';

function tempRoot(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, 'uploads');
}

test('an upload is stored under the root', (t) => {
  const root = tempRoot(t);
  const res = handle({ method: 'POST', path: '/files/report%201.txt', body: 'hello' }, { root });
  assert.equal(res.status, 201);
  assert.equal(fs.readFileSync(path.join(root, 'report 1.txt'), 'utf8'), 'hello');
});

test('a bad name is rejected', (t) => {
  const root = tempRoot(t);
  for (const name of ['..%2Fx.txt', 'a%5Cb.txt', '%00.txt']) {
    assert.equal(handle({ method: 'POST', path: `/files/${name}`, body: 'x' }, { root }).status, 400, name);
  }
  assert.equal(fs.existsSync(path.join(path.dirname(root), 'x.txt')), false);
});
