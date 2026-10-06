import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('the page of a recipe shows its parts and its comments', () => {
  const { call, post } = makeApp();
  const { id } = post({ title: 'Lentil soup', author: 'Carla', ingredients: ['1 cup lentils', '1 onion'], steps: 'Cook the onion.\n\nAdd the lentils.', tags: ['soup', 'winter'] });
  call('POST', `/api/recipes/${id}/comments`, { author: 'Dan', text: 'Made it twice' });
  const res = call('GET', `/recipes/${id}`);
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.match(res.body, /<title>Lentil soup - Recipe board<\/title>/);
  assert.match(res.body, /<h1>Lentil soup<\/h1>/);
  assert.match(res.body, /By Carla/);
  assert.match(res.body, /<li>1 cup lentils<\/li>/);
  assert.match(res.body, /<p>Add the lentils.<\/p>/);
  assert.match(res.body, /href="\/tags\/winter"/);
  assert.match(res.body, /Dan<\/strong>: Made it twice/);
});

test('a missing recipe is a 404', () => {
  const { call } = makeApp();
  assert.equal(call('GET', '/recipes/r9').status, 404);
});

test('a tag page lists the recipes with the tag', () => {
  const { call, post } = makeApp();
  post({ title: 'Lentil soup', tags: ['soup'] });
  post({ title: 'Toast', tags: ['breakfast'] });
  const body = call('GET', '/tags/soup').body;
  assert.match(body, /Lentil soup/);
  assert.doesNotMatch(body, /Toast/);
  assert.equal(call('GET', '/tags/a%2Fb').status, 400);
});

test('the feed lists the newest recipes first', () => {
  const { call, post } = makeApp();
  post({ title: 'Old bread', author: 'Ana' });
  post({ title: 'New cake', author: 'Ben', ingredients: ['flour', 'sugar'], tags: ['sweet'] });
  const res = call('GET', '/feed.xml');
  assert.match(res.headers['content-type'], /rss/);
  assert.ok(res.body.indexOf('New cake') < res.body.indexOf('Old bread'));
  assert.match(res.body, /<description>flour, sugar<\/description>/);
  assert.match(res.body, /<dc:creator>Ben<\/dc:creator>/);
  assert.match(res.body, /<category>sweet<\/category>/);
});
