import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from '../src/worker.mjs';
import { DB_URL, makeDriver, writeConfig } from './helpers.mjs';

test('the worker connects with the database url of the file', () => {
  const driver = makeDriver();
  const worker = createWorker({ configFile: writeConfig({ db: { url: DB_URL } }), env: {}, driver });
  worker.connect();
  assert.deepEqual(driver.calls, [['connect', DB_URL]]);
});

test('the environment variable gives the database url', () => {
  const driver = makeDriver();
  const env = { WORKER_DB_URL: 'postgres://worker:other@db2.example.test/worker' };
  createWorker({ configFile: writeConfig({ queue: { name: 'jobs' } }), env, driver }).connect();
  assert.equal(driver.calls[0][1], env.WORKER_DB_URL);
});

test('migrate runs the migrations and hides the password', () => {
  const driver = makeDriver();
  const result = createWorker({ configFile: writeConfig({ db: { url: DB_URL } }), env: {}, driver }).migrate();
  assert.deepEqual(driver.calls, [['migrate', DB_URL]]);
  assert.deepEqual(result.applied, ['001-create-jobs']);
  assert.ok(!result.target.includes('example-password'));
  assert.ok(result.target.includes('db.example.test'));
});

test('connect fails when no database url is set', () => {
  const worker = createWorker({ configFile: writeConfig({ queue: { name: 'jobs' } }), env: {}, driver: makeDriver() });
  assert.throws(() => worker.connect(), /database url/);
});

test('the queue gives out jobs in order', () => {
  const worker = createWorker({ configFile: writeConfig({ db: { url: DB_URL }, queue: { name: 'mail' } }), env: {} });
  assert.equal(worker.queue.name, 'mail');
  worker.queue.enqueue('a');
  worker.queue.enqueue('b');
  assert.equal(worker.queue.take(), 'a');
  assert.equal(worker.queue.take(), 'b');
  assert.equal(worker.queue.take(), null);
});
