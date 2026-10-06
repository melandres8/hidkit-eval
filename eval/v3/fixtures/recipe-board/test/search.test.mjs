import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('search finds a title or an ingredient and marks the match in the title', () => {
  const { call, post } = makeApp();
  post({ title: 'Lentil soup', ingredients: ['1 cup lentils'] });
  post({ title: 'Tomato salad', ingredients: ['2 tomatoes'] });
  post({ title: 'Toast', ingredients: ['bread', 'soup spoon of butter'] });
  const body = call('GET', '/search', undefined, { q: 'soup' }).body;
  assert.match(body, /<mark>soup<\/mark>/);
  assert.match(body, /Toast/);
  assert.doesNotMatch(body, /Tomato/);
  assert.match(body, /Results for soup/);
});

test('an empty search finds nothing and a long one gets 400', () => {
  const { call, post } = makeApp();
  post({ title: 'Toast' });
  assert.match(call('GET', '/search', undefined, {}).body, /No recipe matches/);
  assert.equal(call('GET', '/search', undefined, { q: 'x'.repeat(101) }).status, 400);
});
