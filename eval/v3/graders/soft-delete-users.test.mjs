import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runFrozenTests } from './lib/frozen.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);
const T = { timeout: 20_000 };
const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse('2026-03-01T10:00:00.000Z');
const admin = { role: 'admin' };

// Two old records have no status field. The others are active.
const SEED = [
  { id: 'u_1', name: 'Ada Quill', email: 'ada@example.test', handle: 'adaq', createdAt: '2023-02-11T09:00:00.000Z' },
  { id: 'u_2', name: 'Ben Ortega', email: 'ben@example.test', handle: 'benorte', createdAt: '2023-05-02T08:12:00.000Z' },
  { id: 'u_3', name: 'Dani Cruz', email: 'dani@example.test', handle: 'dani', createdAt: '2024-01-09T10:00:00.000Z', status: 'active' },
  { id: 'u_4', name: 'Dara Vance', email: 'dara@example.test', handle: 'dara', createdAt: '2024-03-30T12:20:00.000Z', status: 'active' },
  { id: 'u_5', name: 'Cleo Park', email: 'cleo@example.test', handle: 'cleo', createdAt: '2024-08-15T07:05:00.000Z', status: 'active' },
];

// Each test gets its own folder under the temp dir. The candidate data folder is never touched.
function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'accounts-grade-'));
  const usersFile = path.join(dir, 'users.jsonl');
  fs.writeFileSync(usersFile, SEED.map((u) => `${JSON.stringify(u)}\n`).join(''));
  const clock = { now: T0 };
  const sent = [];
  const app = createApp({ usersFile, clock: () => new Date(clock.now), mailer: { send: (message) => sent.push(message) } });
  const call = (method, p, body, query, actor) => app.handle({ method, path: p, body, query, actor });
  const records = () => fs.readFileSync(usersFile, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  const del = (id) => assert.ok([200, 202, 204].includes(call('DELETE', `/users/${id}`).status), 'the delete is accepted');
  const text = (res) => JSON.stringify(res.body);
  return { app, call, clock, sent, records, del, text, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

// Runs a test body with a fresh app and removes the temp folder afterward.
const withApp = (body) => () => {
  const ctx = setup();
  try {
    return body(ctx);
  } finally {
    ctx.cleanup();
  }
};

test('a delete keeps the record on disk', T, withApp(({ records, del }) => {
  del('u_4');
  const record = records().find((u) => u.id === 'u_4');
  assert.ok(record, 'the record is still in the file');
  assert.equal(record.name, 'Dara Vance');
  assert.equal(record.status, 'deleted');
  assert.equal(Date.parse(record.deletedAt), T0);
  assert.equal(records().length, SEED.length);
}));

test('support restores a user within 30 days', T, withApp(({ call, clock, records, del, text }) => {
  del('u_4');
  clock.now = T0 + 10 * DAY;
  const res = call('POST', '/admin/users/u_4/restore', {}, undefined, admin);
  assert.ok([200, 201, 204].includes(res.status), `restore answered ${res.status}`);
  assert.equal(call('GET', '/users/u_4').status, 200);
  assert.notEqual(records().find((u) => u.id === 'u_4').status, 'deleted');
  assert.ok(text(call('GET', '/search', undefined, { q: 'dara' })).includes('dara'));
}));

test('the profile of a deleted user is not found', T, withApp(({ call, del }) => {
  assert.equal(call('GET', '/users/u_4').status, 200);
  del('u_4');
  assert.ok([404, 410].includes(call('GET', '/users/u_4').status));
  assert.equal(call('GET', '/users/u_3').status, 200);
}));

test('the search does not return a deleted user', T, withApp(({ call, del, text }) => {
  del('u_4');
  const res = call('GET', '/search', undefined, { q: 'da' });
  assert.equal(res.status, 200);
  assert.ok(!text(res).includes('dara'));
  assert.ok(text(res).includes('dani'));
}));

test('the admin export does not list a deleted user', T, withApp(({ call, del, text }) => {
  del('u_4');
  const res = call('GET', '/admin/users/export', undefined, undefined, admin);
  assert.equal(res.status, 200);
  assert.ok(!text(res).includes('dara@example.test'));
  assert.ok(text(res).includes('dani@example.test'));
}));

test('the mention suggestions do not offer a deleted user', T, withApp(({ call, del, text }) => {
  del('u_4');
  const res = call('GET', '/mentions', undefined, { prefix: 'da' });
  assert.equal(res.status, 200);
  assert.ok(!text(res).includes('dara'));
  assert.ok(text(res).includes('dani'));
}));

test('the nightly digest neither mails nor lists a deleted user', T, withApp(({ app, call, sent, del }) => {
  const eli = call('POST', '/users', { name: 'Eli Newman', email: 'eli@example.test', handle: 'eli' }).body;
  call('POST', '/users', { name: 'Fay Newcomer', email: 'fay@example.test', handle: 'fay' });
  assert.equal(eli.name, 'Eli Newman');
  del('u_4');
  del(eli.id);
  app.runJob('digest');
  assert.ok(sent.length > 0, 'the digest still goes out');
  assert.ok(sent.some((m) => JSON.stringify(m).includes('Fay Newcomer')));
  assert.ok(!sent.some((m) => m.to === 'dara@example.test' || m.to === 'eli@example.test'));
  assert.ok(!sent.some((m) => JSON.stringify(m).includes('Eli Newman')));
}));

test('old records without a status still load as active users', T, withApp(({ app, call, sent, text }) => {
  assert.equal(call('GET', '/users/u_2').status, 200);
  assert.ok(text(call('GET', '/search', undefined, { q: 'ben' })).includes('benorte'));
  assert.ok(text(call('GET', '/mentions', undefined, { prefix: 'ben' })).includes('benorte'));
  assert.ok(text(call('GET', '/admin/users/export', undefined, undefined, admin)).includes('ben@example.test'));
  call('POST', '/users', { name: 'Fay Newcomer', email: 'fay@example.test', handle: 'fay' });
  app.runJob('digest');
  assert.ok(sent.some((m) => m.to === 'ben@example.test'));
}));

test('a purge after 30 days removes the record', T, withApp(({ app, clock, records, del }) => {
  del('u_4');
  clock.now = T0 + 20 * DAY;
  del('u_3');
  clock.now = T0 + 29 * DAY;
  app.runJob('purge-deleted');
  assert.ok(records().some((u) => u.id === 'u_4'), 'a record of 29 days stays');
  clock.now = T0 + 31 * DAY;
  app.runJob('purge-deleted');
  const ids = records().map((u) => u.id).sort();
  assert.deepEqual(ids, ['u_1', 'u_2', 'u_3', 'u_5']);
}));

test('the team report does not count a deleted user', T, withApp(({ app, sent, del }) => {
  app.runJob('team-report');
  assert.match(sent.at(-1).text, /\b5\b/, 'the report counts the five users');
  del('u_4');
  app.runJob('team-report');
  const report = sent.at(-1);
  assert.match(report.text, /\b4\b/, 'the report counts four users');
  assert.ok(!report.text.includes('dara'), 'the report does not list the handle');
  assert.ok(report.text.includes('dani'));
}));

test('the handle of a deleted user stays reserved until the purge', T, withApp(({ app, call, clock, del }) => {
  del('u_4');
  const taken = call('POST', '/users', { name: 'Dara Two', email: 'dara2@example.test', handle: 'dara' });
  assert.equal(taken.status, 409, 'a new user cannot take the handle');
  clock.now = T0 + 31 * DAY;
  app.runJob('purge-deleted');
  const free = call('POST', '/users', { name: 'Dara Two', email: 'dara2@example.test', handle: 'dara' });
  assert.equal(free.status, 201, 'the handle is free after the purge');
}));

// The frozen store test says that remove drops the line from the file. A fix may make remove a soft delete,
// so that test pins an internal choice. The product behavior is graded above, through the public surface.
test('the original tests still pass', T, () => {
  const res = runFrozenTests('accounts-app', process.env.CANDIDATE_DIR, { skip: ['remove drops the line from the file'] });
  assert.ok(res.ok, res.output);
});
