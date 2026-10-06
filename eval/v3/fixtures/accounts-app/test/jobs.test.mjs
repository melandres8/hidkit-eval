import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jobNames, runJob } from '../src/jobs/index.mjs';
import { makeApp } from './helpers.mjs';

test('the job table lists the digest', () => {
  assert.ok(jobNames.includes('digest'));
});

test('an unknown job name throws', () => {
  assert.throws(() => runJob('nope', {}), /unknown job/);
});

test('the job table lists the team report', () => {
  assert.ok(jobNames.includes('team-report'));
});

test('the team report mails the count and the handles', () => {
  const { app, sent } = makeApp({ seed: true });
  app.runJob('team-report');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'support@example.test');
  assert.match(sent[0].text, /^8 users/);
  assert.match(sent[0].text, /grace/);
});
