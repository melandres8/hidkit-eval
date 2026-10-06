import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('a recipe can be posted and read back', () => {
  const { call } = makeApp();
  const res = call('POST', '/api/recipes', { title: 'Pancakes', author: 'Ana', ingredients: ['2 eggs', '1 cup milk'], steps: 'Mix.\n\nFry.', tags: ['breakfast'] });
  assert.equal(res.status, 201);
  const got = call('GET', `/api/recipes/${res.body.id}`).body;
  assert.equal(got.title, 'Pancakes');
  assert.deepEqual(got.ingredients, ['2 eggs', '1 cup milk']);
  assert.deepEqual(got.comments, []);
});

test('a comment is kept with its recipe', () => {
  const { call, post } = makeApp();
  const { id } = post({ title: 'Soup' });
  assert.equal(call('POST', `/api/recipes/${id}/comments`, { author: 'Ben', text: 'Very good' }).status, 201);
  assert.deepEqual(call('GET', `/api/recipes/${id}`).body.comments.map((c) => c.text), ['Very good']);
  assert.equal(call('POST', '/api/recipes/r99/comments', { author: 'Ben', text: 'x' }).status, 404);
});

test('a body that breaks a limit gets 400', () => {
  const { call } = makeApp();
  assert.equal(call('POST', '/api/recipes', { title: '', author: 'Ana' }).status, 400);
  assert.equal(call('POST', '/api/recipes', { title: 'x'.repeat(201), author: 'Ana' }).status, 400);
  assert.equal(call('POST', '/api/recipes', { title: 'Tea', author: 'Ana', tags: ['bad/tag'] }).status, 400);
  assert.equal(call('POST', '/api/recipes', { title: 'Tea', author: 'Ana', ingredients: 'milk' }).status, 400);
});
