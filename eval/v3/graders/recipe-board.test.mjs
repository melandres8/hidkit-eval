import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';
import { BASIC, assertNoMarkup, checkDigest, checkFeed, checkPage, checkSearch, decodeOnce, defineAttackTests, makeEnv } from './lib/recipe-board-attacks.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);
const T = { timeout: 20_000 };

test('the recipe page shows the text of a recipe and its comments as text', T, () => {
  for (const text of BASIC) checkPage(makeEnv(createApp), text);
});

test('the search page shows the search and the results as text, and still marks the match', T, () => {
  for (const text of BASIC) checkSearch(makeEnv(createApp), text);
  const env = makeEnv(createApp);
  env.post('Fish <xss-1>x</xss-1> soup');
  const body = env.outputs.search('soup').body;
  assertNoMarkup('search soup', body);
  assert.match(body, /<mark>soup<\/mark>/, 'the match is not in a mark element');
});

test('the feed shows the text of a recipe as text', T, () => {
  for (const text of BASIC) checkFeed(makeEnv(createApp), text);
});

test('the weekly digest shows the text of a recipe as text', T, () => {
  for (const text of BASIC) checkDigest(makeEnv(createApp), text);
});

test('text with &, <, quotes or accents shows as typed on every output, and the API returns it as typed', T, () => {
  const odd = ['Fish & chips', 'Tom\'s "best" pie', '1 < 2 > 0', 'Crème brûlée 🍮', 'R&D <3 pie'];
  for (const text of odd) {
    const env = makeEnv(createApp);
    const id = env.post(text);
    const api = env.call('GET', `/api/recipes/${id}`).body;
    assert.equal(api.title, text, `API title of ${text}`);
    assert.deepEqual(api.ingredients, [text, '2 eggs'], `API ingredients of ${text}`);
    assert.equal(api.comments[0].text, text, `API comment of ${text}`);
    const outputs = {
      page: env.outputs.page(id).body,
      search: env.outputs.search(text).body,
      feed: env.outputs.feed().body,
      digest: env.digest(),
    };
    for (const [name, output] of Object.entries(outputs)) {
      assert.ok(decodeOnce(output).includes(text), `${name} does not show ${JSON.stringify(text)} as typed`);
    }
  }
});

defineAttackTests({ createApp });

test('the original tests still pass', T, () => {
  const res = runFrozenTests('recipe-board');
  assert.ok(res.ok, res.output);
});
