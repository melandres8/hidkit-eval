import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';

const CANDIDATE = process.env.CANDIDATE_DIR;
const { createWorker } = await import(`${CANDIDATE}/src/worker.mjs`);
const { runCli } = await import(`${CANDIDATE}/src/cli/index.mjs`);
const T = { timeout: 20_000 };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'config-migration-'));
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const NEW_URL = 'postgres://worker:new-secret@db.example.test:5432/worker';
const OLD_URL = 'postgres://worker:old-secret@old-db.example.test:5432/worker';
const ENV_URL = 'postgres://worker:env-secret@env-db.example.test:5432/worker';
const CACHE_URL = 'redis://:cache-secret@cache.example.test:6379/0';

let counter = 0;
const write = (config) => {
  const file = path.join(tmp, `worker-${++counter}.json`);
  fs.writeFileSync(file, JSON.stringify(config));
  return file;
};
const withNew = (url = NEW_URL, extra = {}) => ({ database: { connectionString: url }, cache: { url: CACHE_URL }, queue: { name: 'jobs' }, ...extra });
const withOld = (url = OLD_URL, extra = {}) => ({ db: { url }, cache: { url: CACHE_URL }, queue: { name: 'jobs' }, ...extra });

function makeDriver() {
  const calls = [];
  return { calls, connect: (url) => (calls.push(['connect', url]), { url }), migrate: (url) => (calls.push(['migrate', url]), []) };
}
const sink = () => {
  const chunks = [];
  return { write: (text) => chunks.push(text), text: () => chunks.join('') };
};
function cli(argv, { env = {}, driver = makeDriver() } = {}) {
  const stdout = sink();
  const stderr = sink();
  const code = runCli(argv, { stdout, stderr, env, driver });
  return { code, out: stdout.text(), err: stderr.text(), driver };
}
function worker(config, { env = {} } = {}) {
  const driver = makeDriver();
  const warnings = [];
  const w = createWorker({ configFile: write(config), env, driver, warn: (message) => warnings.push(String(message)) });
  return { w, driver, warnings };
}
// Every place that reads the connection string: connect, migrate and the output of config show.
function useEverywhere(config, expectedUrl, secret) {
  const { w, driver, warnings } = worker(config);
  w.connect();
  w.migrate();
  assert.deepEqual(driver.calls, [['connect', expectedUrl], ['migrate', expectedUrl]]);
  const file = write(config);
  const shown = cli(['config', 'show', file]);
  assert.equal(shown.code, 0);
  assert.ok(!shown.out.includes(secret), 'config show prints the password of the database URL');
  assert.ok(shown.out.includes(new URL(expectedUrl).host), 'config show still shows the host');
  const migrated = cli(['migrate', '--config', file]);
  assert.equal(migrated.code, 0);
  assert.deepEqual(migrated.driver.calls, [['migrate', expectedUrl]]);
  assert.ok(!migrated.out.includes(secret), 'migrate prints the password of the database URL');
  return { warnings };
}

test('the new key database.connectionString works everywhere', T, () => {
  const { warnings } = useEverywhere(withNew(), NEW_URL, 'new-secret');
  assert.deepEqual(warnings, [], 'the new key gives no warning');
  // The environment variable still sets the connection string, with no warning.
  const fromEnv = worker({ queue: { name: 'jobs' } }, { env: { WORKER_DB_URL: ENV_URL } });
  fromEnv.w.connect();
  assert.deepEqual(fromEnv.driver.calls, [['connect', ENV_URL]]);
  assert.deepEqual(fromEnv.warnings, []);
  const override = worker(withNew(), { env: { WORKER_DB_URL: ENV_URL } });
  override.w.connect();
  assert.deepEqual(override.driver.calls, [['connect', ENV_URL]]);
  assert.deepEqual(override.warnings, []);
  const checked = cli(['config', 'check', write(withNew())]);
  assert.equal(checked.code, 0, checked.out);
});

test('the old key db.url still works and gives one deprecation warning', T, () => {
  const { w, driver, warnings } = worker(withOld());
  w.connect();
  w.migrate();
  w.connect();
  assert.deepEqual(driver.calls, [['connect', OLD_URL], ['migrate', OLD_URL], ['connect', OLD_URL]]);
  assert.equal(warnings.length, 1, `expected one warning, got ${JSON.stringify(warnings)}`);
  assert.match(warnings[0], /db\.url/);
  const file = write(withOld());
  const migrated = cli(['migrate', '--config', file]);
  assert.equal(migrated.code, 0);
  assert.deepEqual(migrated.driver.calls, [['migrate', OLD_URL]]);
  assert.equal(migrated.err.split('\n').filter((line) => line.includes('db.url')).length, 1, 'one warning line on stderr');
  const checked = cli(['config', 'check', file]);
  assert.equal(checked.code, 0, 'an old file stays valid');
});

test('when both keys are set the new key wins and the warning names both', T, () => {
  const { w, driver, warnings } = worker({ ...withNew(), db: { url: OLD_URL } });
  w.connect();
  w.migrate();
  assert.deepEqual(driver.calls, [['connect', NEW_URL], ['migrate', NEW_URL]]);
  assert.equal(warnings.length, 1, `expected one warning, got ${JSON.stringify(warnings)}`);
  assert.match(warnings[0], /db\.url/);
  assert.match(warnings[0], /database\.connectionString/);
});

test('config check and the examples use the new key', T, () => {
  const none = cli(['config', 'check', write({ queue: { name: 'jobs' } })]);
  assert.equal(none.code, 1);
  assert.ok(none.out.includes('database.connectionString'), 'the missing key is the new one');
  assert.ok(!none.out.includes('db.url'), 'the error does not name the old key');
  const oldFile = cli(['config', 'check', write(withOld())]);
  assert.ok(!oldFile.out.includes('error'), 'an old file has no error');
  const examples = path.join(CANDIDATE, 'examples');
  const names = fs.readdirSync(examples).filter((name) => name.endsWith('.json'));
  assert.ok(names.length >= 3, 'the examples are still there');
  for (const name of names) {
    const config = JSON.parse(fs.readFileSync(path.join(examples, name), 'utf8'));
    assert.ok(typeof config.database?.connectionString === 'string', `${name} sets database.connectionString`);
    assert.ok(config.db?.url === undefined, `${name} still sets db.url`);
    const res = cli(['config', 'check', path.join(examples, name)]);
    assert.equal(res.code, 0, `${name}: ${res.out}`);
    assert.equal(res.err, '', `${name} gives a warning: ${res.err}`);
  }
});

test('config get accepts the old key name and masks the password', T, () => {
  const fileNew = write(withNew());
  const byNew = cli(['config', 'get', fileNew, 'database.connectionString']);
  assert.equal(byNew.code, 0, byNew.err);
  assert.ok(byNew.out.includes(new URL(NEW_URL).host), 'the value is shown');
  assert.ok(!byNew.out.includes('new-secret'), 'the password is masked');
  assert.equal(byNew.err, '', 'the new name gives no warning');
  const byOld = cli(['config', 'get', fileNew, 'db.url']);
  assert.equal(byOld.code, 0, byOld.err);
  assert.ok(byOld.out.includes(new URL(NEW_URL).host), 'the old name finds the value');
  assert.ok(!byOld.out.includes('new-secret'), 'the password is masked');
  assert.equal(byOld.err.split('\n').filter((line) => line.includes('db.url')).length, 1, 'one warning for the old name');
  const fileOld = write(withOld());
  const oldFileNewName = cli(['config', 'get', fileOld, 'database.connectionString']);
  assert.equal(oldFileNewName.code, 0, oldFileNewName.err);
  assert.ok(oldFileNewName.out.includes(new URL(OLD_URL).host));
  assert.ok(!oldFileNewName.out.includes('old-secret'));
  assert.equal(oldFileNewName.err.split('\n').filter((line) => line.includes('db.url')).length, 1, 'one warning for the old file');
  const oldBoth = cli(['config', 'get', fileOld, 'db.url']);
  assert.equal(oldBoth.code, 0, oldBoth.err);
  assert.ok(oldBoth.out.includes(new URL(OLD_URL).host) && !oldBoth.out.includes('old-secret'));
  assert.equal(cli(['config', 'get', fileNew, 'queue.name']).out, 'jobs\n');
});

test('config show prints the new key name for an old file', T, () => {
  const shown = cli(['config', 'show', write(withOld())]);
  assert.equal(shown.code, 0);
  const printed = JSON.parse(shown.out);
  assert.ok(new URL(printed.database.connectionString).host === new URL(OLD_URL).host, 'the value is under the new key');
  assert.ok(!printed.database.connectionString.includes('old-secret'));
  assert.equal(printed.db?.url, undefined, 'the old key is not printed');
});

test('the original tests still pass', T, () => {
  const res = runFrozenTests('worker-app');
  assert.ok(res.ok, res.output);
});
