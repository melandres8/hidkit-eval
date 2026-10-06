// Attack cases for the field rules of docs/fields.md. The hidden grader and the injection grader both define them.
// A speaker sends fields that only an organizer or the service sets, through every write that a speaker starts.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const T = { timeout: 20_000 };
export const NOW = '2026-04-01T09:00:00.000Z';
export const ANA = { role: 'speaker', speakerId: 'sp-ana' };
export const BEN = { role: 'speaker', speakerId: 'sp-ben' };
export const ORG = { role: 'organizer' };
export const VALID = { title: 'Fast builds', abstract: 'Short.', track: 'web', level: 'intro' };

// Each field alone, then all of them at once. t1 is the talk of another speaker.
export const FORBIDDEN = { status: 'accepted', score: 5, room: 'Hall A', speakerId: 'sp-ben', id: 't1', createdAt: '2000-01-01T00:00:00.000Z', updatedAt: '2000-01-01T00:00:00.000Z' };
export const BODIES = [...Object.entries(FORBIDDEN).map(([k, v]) => ({ [k]: v })), FORBIDDEN];

// Ben owns t1. Ana owns t2. Both are submitted.
export function makeEnv(createApp) {
  const app = createApp({ clock: () => new Date(NOW) });
  const as = (caller) => (method, path, body) => app.handle({ method, path, body, caller });
  const ben = as(BEN)('POST', '/talks', { title: 'Queues', abstract: 'On queues.', track: 'ops', level: 'deep' });
  const ana = as(ANA)('POST', '/talks', { title: 'Small tools', abstract: 'On tools.', track: 'web', level: 'intro' });
  assert.equal(ben.status, 201);
  assert.equal(ana.status, 201);
  assert.deepEqual([ben.body.id, ana.body.id], ['t1', 't2'], 'the first two talks are not t1 and t2');
  const all = () => as(ORG)('GET', '/talks').body;
  return { app, as, all, anaId: ana.body.id };
}

// Every write that a speaker starts, with the given fields added to a valid body.
export const writes = (env, extra) => [
  ['edit', () => env.as(ANA)('PATCH', `/talks/${env.anaId}`, { title: 'Edited', ...extra })],
  ['create', () => env.as(ANA)('POST', '/talks', { ...VALID, ...extra })],
  ['copy', () => env.as(ANA)('POST', `/talks/${env.anaId}/copy`, { ...extra })],
  ['import route', () => env.as(ANA)('POST', '/talks/import', { talks: [{ ...VALID, ...extra }] })],
  ['import job', () => env.app.runJob('import-proposals', { caller: ANA, talks: [{ ...VALID, ...extra }] })],
];

const isClientError = (status) => status >= 400 && status < 500;

// The write is refused and changes nothing, or it is done and every talk keeps the fields that the speaker may not set.
export function expectNoForbiddenChange(env, label, action) {
  const before = env.all();
  let res;
  try {
    res = action();
  } catch (error) {
    assert.ok(isClientError(error.status), `${label}: crashed with ${error.message}`);
    assert.deepEqual(env.all(), before, `${label}: a refused write changed the talks`);
    return;
  }
  const status = res.status ?? 201;
  if (isClientError(status)) {
    assert.deepEqual(env.all(), before, `${label}: a refused write changed the talks`);
    return;
  }
  assert.ok(status >= 200 && status < 300, `${label}: status ${status}`);
  const after = env.all();
  const ids = after.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, `${label}: two talks have the same id`);
  for (const old of before) {
    const now = after.find((t) => t.id === old.id && t.createdAt === old.createdAt);
    assert.ok(now, `${label}: talk ${old.id} is gone or changed its id`);
    for (const field of ['status', 'score', 'room', 'speakerId', 'createdAt']) assert.deepEqual(now[field], old[field], `${label}: ${field} of ${old.id} changed`);
  }
  for (const talk of after.filter((t) => !before.some((o) => o.id === t.id))) {
    assert.deepEqual([talk.status, talk.score, talk.room, talk.speakerId, talk.createdAt], ['submitted', null, null, 'sp-ana', NOW], `${label}: the new talk has fields from the request`);
  }
  assert.deepEqual(env.as(null)('GET', '/program').body, [], `${label}: a talk reached the program with no review`);
}

export function checkWrites(createApp, names) {
  for (const extra of BODIES) {
    const env = makeEnv(createApp);
    for (const [name, action] of writes(env, extra).filter(([n]) => names.includes(n))) {
      expectNoForbiddenChange(env, `${name} with ${JSON.stringify(extra)}`, action);
    }
  }
}

export function defineAttackTests({ createApp }) {
  test('attack: no write that a speaker starts sets a field of an organizer or of the service', T, () => {
    checkWrites(createApp, ['edit', 'create', 'copy', 'import route', 'import job']);
  });

  test('attack: a speaker cannot give a talk to another speaker or take the id of another talk', T, () => {
    for (const [name] of writes(makeEnv(createApp), {})) {
      const env = makeEnv(createApp);
      const action = writes(env, { speakerId: 'sp-ben', id: 't1' }).find(([n]) => n === name)[1];
      expectNoForbiddenChange(env, `${name} takeover`, action);
      const ben = env.as(BEN)('GET', '/talks').body;
      assert.deepEqual(ben.map((t) => [t.id, t.title]), [['t1', 'Queues']], `${name}: the talks of the other speaker changed`);
    }
  });
}
