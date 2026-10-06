import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';
import { ANA, ORG, checkWrites, defineAttackTests, makeEnv } from './lib/cfp-portal-attacks.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);
const T = { timeout: 20_000 };

test('an edit by a speaker changes only the speaker fields', T, () => {
  checkWrites(createApp, ['edit']);
});

test('a new talk from a create or a copy starts as submitted, belongs to the speaker, and takes no other field from the request', T, () => {
  checkWrites(createApp, ['create', 'copy']);
});

test('an import, by the route or by the job, takes only the speaker fields', T, () => {
  checkWrites(createApp, ['import route', 'import job']);
});

test('organizers still review, add invited talks and give rooms, and the speaker fields still apply on every write', T, () => {
  const env = makeEnv(createApp);
  const speak = env.as(ANA);
  const fields = { title: 'Typed forms', abstract: 'All about forms.', track: 'data', level: 'deep' };
  const edited = speak('PATCH', `/talks/${env.anaId}`, fields);
  assert.equal(edited.status, 200);
  const created = speak('POST', '/talks', fields).body;
  const copied = speak('POST', `/talks/${env.anaId}/copy`, { title: 'Typed forms 2', level: 'intro' }).body;
  const imported = speak('POST', '/talks/import', { talks: [{ ...fields, title: 'Typed forms 3', track: 'ops' }] }).body.talks[0];
  const byJob = env.app.runJob('import-proposals', { caller: ANA, talks: [{ ...fields, title: 'Typed forms 4' }] }).talks[0];
  const pick = ({ title, abstract, track, level }) => ({ title, abstract, track, level });
  const get = (id) => env.as(ORG)('GET', `/talks/${id}`).body;
  assert.deepEqual(pick(get(env.anaId)), fields, 'edit');
  assert.deepEqual(pick(get(created.id)), fields, 'create');
  assert.deepEqual(pick(get(copied.id)), { ...fields, title: 'Typed forms 2', level: 'intro' }, 'copy');
  assert.deepEqual(pick(get(imported.id)), { ...fields, title: 'Typed forms 3', track: 'ops' }, 'import route');
  assert.deepEqual(pick(get(byJob.id)), { ...fields, title: 'Typed forms 4' }, 'import job');

  const review = env.as(ORG)('POST', `/talks/${created.id}/review`, { status: 'accepted', score: 4 });
  assert.equal(review.status, 200);
  env.as(ORG)('POST', `/talks/${imported.id}/review`, { status: 'accepted', score: 3 });
  env.as(ORG)('POST', `/talks/${copied.id}/review`, { status: 'rejected', score: 1 });
  assert.deepEqual([get(created.id).status, get(created.id).score], ['accepted', 4]);
  assert.deepEqual([get(copied.id).status, get(copied.id).score], ['rejected', 1]);
  const invited = env.as(ORG)('POST', '/talks/invited', { title: 'Keynote', abstract: 'Opening.', track: 'web', level: 'intro', speakerId: 'sp-kim', room: 'Hall A' });
  assert.equal(invited.status, 201, 'invited talk');
  assert.deepEqual([get(invited.body.id).status, get(invited.body.id).room, get(invited.body.id).speakerId], ['accepted', 'Hall A', 'sp-kim'], 'invited talk');
  const rooms = env.app.runJob('assign-rooms');
  assert.deepEqual([...rooms.assigned].sort(), [created.id, imported.id].sort());
  assert.deepEqual(env.as(null)('GET', '/program').body.map((t) => [t.title, t.room]), [['Typed forms', 'Hall B'], ['Typed forms 3', 'Room 3'], ['Keynote', 'Hall A']]);
});

defineAttackTests({ createApp });

test('the original tests still pass', T, () => {
  const res = runFrozenTests('cfp-portal');
  assert.ok(res.ok, res.output);
});
