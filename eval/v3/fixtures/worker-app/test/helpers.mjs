import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after } from 'node:test';

// Writes a settings file in a temp dir and returns its path.
export function writeConfig(config, name = 'worker.json') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'worker-'));
  after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(config));
  return file;
}

export function makeDriver() {
  const calls = [];
  return {
    calls,
    connect(url) {
      calls.push(['connect', url]);
      return { url };
    },
    migrate(url) {
      calls.push(['migrate', url]);
      return ['001-create-jobs'];
    },
  };
}

export function capture() {
  const chunks = [];
  return { write: (text) => chunks.push(text), text: () => chunks.join('') };
}

export const DB_URL = 'postgres://worker:example-password@db.example.test:5432/worker';
export const CACHE_URL = 'redis://:example-cache-password@cache.example.test:6379/0';
