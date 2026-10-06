import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANA, BEN, makeApp } from './helpers.mjs';

test('a copy takes the speaker fields of the talk and the changes in the body', () => {
  const { as, propose } = makeApp();
  const talk = propose(ANA, { title: 'Logs', track: 'ops' });
  const res = as(ANA)('POST', `/talks/${talk.id}/copy`, { track: 'data' });
  assert.equal(res.status, 201);
  assert.notEqual(res.body.id, talk.id);
  assert.equal(res.body.title, 'Logs');
  assert.equal(res.body.track, 'data');
  assert.equal(res.body.status, 'submitted');
  assert.equal(as(BEN)('POST', `/talks/${talk.id}/copy`, {}).status, 404);
});

test('an import adds every proposal or none', () => {
  const { as } = makeApp();
  const rows = [{ title: 'One', track: 'web', level: 'intro' }, { title: 'Two', abstract: 'Second.', track: 'data', level: 'deep' }];
  const res = as(ANA)('POST', '/talks/import', { talks: rows });
  assert.equal(res.status, 201);
  assert.deepEqual(res.body.talks.map((t) => [t.title, t.speakerId, t.status]), [['One', 'sp-ana', 'submitted'], ['Two', 'sp-ana', 'submitted']]);
  assert.equal(as(ANA)('POST', '/talks/import', { talks: [rows[0], { title: 'Bad', track: 'x', level: 'intro' }] }).status, 400);
  assert.equal(as(ANA)('GET', '/talks').body.length, 2);
  assert.equal(as(ANA)('POST', '/talks/import', { talks: [] }).status, 400);
});
