import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from '../src/cli/index.mjs';
import { CACHE_URL, DB_URL, capture, makeDriver, writeConfig } from './helpers.mjs';

function run(argv, { driver = makeDriver(), env = {} } = {}) {
  const stdout = capture();
  const stderr = capture();
  const code = runCli(argv, { stdout, stderr, env, driver });
  return { code, out: stdout.text(), err: stderr.text(), driver };
}

test('version prints the version', () => {
  const res = run(['version']);
  assert.equal(res.code, 0);
  assert.match(res.out, /^\d+\.\d+\.\d+\n$/);
});

test('an unknown command returns 2', () => {
  const res = run(['launch']);
  assert.equal(res.code, 2);
  assert.match(res.err, /unknown command launch/);
});

test('config check returns 0 for a good file and 1 for a bad one', () => {
  const good = run(['config', 'check', writeConfig({ db: { url: DB_URL } })]);
  assert.equal(good.code, 0);
  assert.equal(good.out, 'config ok\n');
  const bad = run(['config', 'check', writeConfig({ queue: { name: 'jobs' } })]);
  assert.equal(bad.code, 1);
  assert.match(bad.out, /^error: missing required key/m);
});

test('config show hides the password of the cache url', () => {
  const res = run(['config', 'show', writeConfig({ db: { url: DB_URL }, cache: { url: CACHE_URL } })]);
  assert.equal(res.code, 0);
  assert.ok(!res.out.includes('example-cache-password'));
  assert.equal(JSON.parse(res.out).queue.name, 'jobs');
});

test('migrate prints the target and the applied migrations', () => {
  const res = run(['migrate', '--config', writeConfig({ db: { url: DB_URL } })]);
  assert.equal(res.code, 0);
  assert.match(res.out, /^migrating postgres:\/\/worker:\*\*\*@db\.example\.test/);
  assert.match(res.out, /applied 001-create-jobs/);
  assert.deepEqual(res.driver.calls, [['migrate', DB_URL]]);
});

test('start connects and names the queue', () => {
  const res = run(['start', '--config', writeConfig({ db: { url: DB_URL }, queue: { name: 'mail' } })]);
  assert.equal(res.code, 0);
  assert.equal(res.out, 'worker started on queue mail\n');
  assert.deepEqual(res.driver.calls, [['connect', DB_URL]]);
});

test('a warning of the loader goes to stderr', () => {
  const res = run(['config', 'check', writeConfig({ db: { url: DB_URL }, colour: {} })]);
  assert.equal(res.code, 0);
  assert.match(res.err, /^warning: unknown config section "colour"$/m);
});

test('config get prints one value and masks passwords', () => {
  const file = writeConfig({ db: { url: DB_URL }, cache: { url: CACHE_URL } });
  const queue = run(['config', 'get', file, 'queue.name']);
  assert.equal(queue.code, 0);
  assert.equal(queue.out, 'jobs\n');
  const cache = run(['config', 'get', file, 'cache.url']);
  assert.ok(!cache.out.includes('example-cache-password'));
  assert.ok(cache.out.includes('cache.example.test'));
  assert.equal(run(['config', 'get', file, 'nope.key']).code, 1);
  assert.equal(run(['config', 'get', file]).code, 2);
});
