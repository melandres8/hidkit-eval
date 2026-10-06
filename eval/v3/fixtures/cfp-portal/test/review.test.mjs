import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANA, ORG, makeApp } from './helpers.mjs';

test('an organizer reviews a talk, and an accepted talk shows in the program', () => {
  const { as, propose } = makeApp();
  const web = propose(ANA, { title: 'Forms' });
  const ops = propose(ANA, { title: 'Alerts', track: 'ops' });
  const rejected = propose(ANA, { title: 'Old idea' });
  const res = as(ORG)('POST', `/talks/${web.id}/review`, { status: 'accepted', score: 4 });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'accepted');
  assert.equal(res.body.score, 4);
  as(ORG)('POST', `/talks/${ops.id}/review`, { status: 'accepted', score: 5 });
  as(ORG)('POST', `/talks/${rejected.id}/review`, { status: 'rejected', score: 1 });
  assert.deepEqual(as(null)('GET', '/program').body.map((t) => t.title), ['Alerts', 'Forms']);
});

test('only an organizer reviews, with a valid status and score', () => {
  const { as, propose } = makeApp();
  const talk = propose(ANA);
  assert.equal(as(ANA)('POST', `/talks/${talk.id}/review`, { status: 'accepted', score: 5 }).status, 403);
  assert.equal(as(ORG)('POST', `/talks/${talk.id}/review`, { status: 'maybe', score: 3 }).status, 400);
  assert.equal(as(ORG)('POST', `/talks/${talk.id}/review`, { status: 'accepted', score: 9 }).status, 400);
  assert.equal(as(ORG)('POST', '/talks/t99/review', { status: 'accepted', score: 3 }).status, 404);
});

test('talk stats count by status and by track', () => {
  const { app, propose } = makeApp();
  propose(ANA);
  propose(ANA, { track: 'data' });
  assert.deepEqual(app.runJob('talk-stats'), { byStatus: { submitted: 2 }, byTrack: { web: 1, data: 1 } });
});
