import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('the digest lists the people who joined in the last day', () => {
  const { app, sent, addUser } = makeApp();
  addUser('Dani Cruz', 'dani');
  addUser('Cleo Park', 'cleo');
  app.runJob('digest');
  assert.deepEqual(sent.map((m) => m.to).sort(), ['cleo@example.test', 'dani@example.test']);
  assert.match(sent[0].text, /Dani Cruz/);
  assert.match(sent[0].text, /Cleo Park/);
});

test('the digest sends nothing when nobody joined', () => {
  const { app, sent, addUser, clock } = makeApp();
  addUser('Dani Cruz', 'dani');
  clock.now = new Date('2026-03-04T10:00:00.000Z');
  app.runJob('digest');
  assert.deepEqual(sent, []);
});
