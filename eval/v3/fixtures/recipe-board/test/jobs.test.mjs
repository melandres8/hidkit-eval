import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('the weekly digest sends the recipes of the last 7 days', () => {
  const { app, call, post, sent, setNow } = makeApp();
  setNow('2026-03-01T10:00:00.000Z');
  post({ title: 'Old bread' });
  setNow('2026-03-08T09:00:00.000Z');
  const { id } = post({ title: 'Lemon cake', author: 'Ben', tags: ['sweet'] });
  call('POST', `/api/recipes/${id}/comments`, { author: 'Dan', text: 'Lovely' });
  setNow('2026-03-09T10:00:00.000Z');
  assert.deepEqual(app.runJob('weekly-digest', { to: 'club@example.test' }), { sent: 1, recipes: 1 });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'club@example.test');
  assert.match(sent[0].html, /Lemon cake/);
  assert.match(sent[0].html, /Dan: Lovely/);
  assert.doesNotMatch(sent[0].html, /Old bread/);
});

test('the digest sends nothing in a week with no recipe', () => {
  const { app, sent } = makeApp();
  assert.deepEqual(app.runJob('weekly-digest', { to: 'club@example.test' }), { sent: 0, recipes: 0 });
  assert.equal(sent.length, 0);
});

test('tag counts', () => {
  const { app, post } = makeApp();
  post({ title: 'A', tags: ['soup'] });
  post({ title: 'B', tags: ['soup', 'winter'] });
  assert.deepEqual(app.runJob('tag-counts').counts, { soup: 2, winter: 1 });
});
