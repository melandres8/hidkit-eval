import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config/load.mjs';
import { check } from '../src/config/schema.mjs';
import { DB_URL, writeConfig } from './helpers.mjs';

test('defaults fill the keys that the file leaves out', () => {
  const config = loadConfig(writeConfig({ db: { url: DB_URL } }), { env: {} });
  assert.equal(config.queue.name, 'jobs');
  assert.equal(config.pool.size, 5);
  assert.equal(config.log.level, 'info');
});

test('the file overrides the defaults', () => {
  const config = loadConfig(writeConfig({ db: { url: DB_URL }, pool: { size: 12 }, queue: { name: 'mail' } }), { env: {} });
  assert.equal(config.pool.size, 12);
  assert.equal(config.queue.name, 'mail');
  assert.equal(config.queue.pollIntervalMs, 500);
});

test('an environment variable overrides the file', () => {
  const file = writeConfig({ db: { url: DB_URL }, log: { level: 'info' } });
  const config = loadConfig(file, { env: { WORKER_LOG_LEVEL: 'debug', WORKER_QUEUE: 'urgent' } });
  assert.equal(config.log.level, 'debug');
  assert.equal(config.queue.name, 'urgent');
});

test('an unknown section gives a warning', () => {
  const warnings = [];
  loadConfig(writeConfig({ db: { url: DB_URL }, colour: { theme: 'dark' } }), { env: {}, warn: (m) => warnings.push(m) });
  const unknown = warnings.filter((message) => message.includes('colour'));
  assert.equal(unknown.length, 1);
});

test('a missing file throws', () => {
  const file = writeConfig({});
  assert.throws(() => loadConfig(file.replace('worker.json', 'missing.json'), { env: {} }));
});

test('check accepts a complete file and names each problem', () => {
  const ok = loadConfig(writeConfig({ db: { url: DB_URL } }), { env: {} });
  assert.deepEqual(check(ok), []);
  const bad = loadConfig(writeConfig({ cache: { url: 'not a url' }, pool: { size: 0 }, log: { level: 'loud' } }), { env: {} });
  const problems = check(bad);
  assert.equal(problems.length, 4);
  assert.ok(problems.some((p) => p.includes('cache.url')));
  assert.ok(problems.some((p) => p.includes('pool.size')));
});
