import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from '../src/cli/index.mjs';
import { capture } from './helpers.mjs';

const dir = new URL('../examples/', import.meta.url);

test('every example passes config check', () => {
  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.json'));
  assert.ok(files.length >= 3);
  for (const name of files) {
    const stdout = capture();
    const stderr = capture();
    assert.equal(runCli(['config', 'check', new URL(name, dir).pathname], { stdout, stderr, env: {} }), 0, name);
  }
});
