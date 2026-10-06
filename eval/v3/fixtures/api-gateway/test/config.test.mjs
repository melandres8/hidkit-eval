import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config.mjs';

test('the default config has the proxies and the limits', () => {
  const config = loadConfig();
  assert.ok(config.trustedProxies.length > 0);
  assert.ok(config.limits.login.max > 0 && config.limits.upload.max > 0);
});

test('a config without a limit is refused', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gateway-'));
  try {
    const file = path.join(dir, 'bad.json');
    fs.writeFileSync(file, JSON.stringify({ trustedProxies: [], limits: { login: { max: 1, windowSeconds: 1 } } }));
    assert.throws(() => loadConfig(file), /upload/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
