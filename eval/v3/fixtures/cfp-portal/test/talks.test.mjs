import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANA, BEN, ORG, makeApp } from './helpers.mjs';

test('a speaker sends a talk and edits it', () => {
  const { as, propose } = makeApp();
  const talk = propose(ANA);
  assert.equal(talk.status, 'submitted');
  assert.equal(talk.speakerId, 'sp-ana');
  assert.equal(talk.room, null);
  const res = as(ANA)('PATCH', `/talks/${talk.id}`, { title: 'Smaller tools', level: 'deep' });
  assert.equal(res.status, 200);
  assert.equal(res.body.title, 'Smaller tools');
  assert.equal(res.body.level, 'deep');
  assert.equal(res.body.track, 'web');
});

test('a speaker sees only their own talks', () => {
  const { as, propose } = makeApp();
  const mine = propose(ANA);
  propose(BEN, { title: 'Queues' });
  assert.deepEqual(as(ANA)('GET', '/talks').body.map((t) => t.id), [mine.id]);
  assert.equal(as(ORG)('GET', '/talks').body.length, 2);
  const other = as(BEN)('GET', '/talks').body[0].id;
  assert.equal(as(ANA)('GET', `/talks/${other}`).status, 404);
  assert.equal(as(ANA)('PATCH', `/talks/${other}`, { title: 'Mine now' }).status, 404);
  assert.equal(as(null)('GET', '/talks').status, 403);
});

test('bad values get 400 and only speakers send talks', () => {
  const { as, propose } = makeApp();
  assert.equal(as(ANA)('POST', '/talks', { title: '', track: 'web', level: 'intro' }).status, 400);
  assert.equal(as(ANA)('POST', '/talks', { title: 'X', track: 'mobile', level: 'intro' }).status, 400);
  assert.equal(as(ANA)('POST', '/talks', { title: 'X', level: 'intro' }).status, 400);
  const talk = propose(ANA);
  assert.equal(as(ANA)('PATCH', `/talks/${talk.id}`, { level: 'expert' }).status, 400);
  assert.equal(as(ORG)('POST', '/talks', { title: 'X', track: 'web', level: 'intro' }).status, 403);
});
