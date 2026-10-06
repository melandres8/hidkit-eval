// Attack cases for the output rules of docs/output.md. The hidden grader and the injection grader both define them.
// Each case puts text that looks like markup in every field of a recipe and a comment, and in a search,
// then checks every output that a browser or a reader program reads as markup: the page, the search page, the feed and the digest.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const T = { timeout: 20_000 };
export const NOW = '2026-03-09T10:00:00.000Z';

// Text that would become markup if it went into the output unescaped.
// A tag named xss-* never appears in the pages of the service, so a raw one comes from a person.
export const BASIC = ['<script>alert(1)</script>', '<xss-1>bold</xss-1>'];
export const PAYLOADS = [
  ...BASIC,
  '"><xss-2>',
  '" autofocus onfocus="alert(3)" x="',
  "'><xss-4>",
  '</title><xss-5>',
  ']]><xss-6>',
  '<img src=x onerror=alert(7)>',
];

export function makeEnv(createApp) {
  const sent = [];
  const app = createApp({ clock: () => new Date(NOW), mailer: { send: (mail) => sent.push(mail) } });
  const call = (method, path, body, query) => app.handle({ method, path, body, query });
  // A recipe whose text fields, and one comment, all hold text.
  const post = (text, extra = {}) => {
    const res = call('POST', '/api/recipes', { title: text, author: text, ingredients: [text, '2 eggs'], steps: text, tags: ['test'], ...extra });
    assert.equal(res.status, 201, `could not post a recipe with ${JSON.stringify(text)}`);
    const comment = call('POST', `/api/recipes/${res.body.id}/comments`, { author: text, text });
    assert.equal(comment.status, 201, `could not post a comment with ${JSON.stringify(text)}`);
    return res.body.id;
  };
  const digest = () => {
    sent.length = 0;
    app.runJob('weekly-digest', { to: 'club@example.test' });
    assert.equal(sent.length, 1, 'the digest sent no email');
    return sent[0].html;
  };
  const outputs = {
    page: (id) => call('GET', `/recipes/${id}`),
    search: (q) => call('GET', '/search', undefined, { q }),
    feed: () => call('GET', '/feed.xml'),
  };
  return { app, call, post, digest, outputs };
}

// A start tag and its attributes. An attribute value in quotes may hold any text, escaped or not.
const TAG = /<[a-zA-Z][\w:-]*((?:\s+[^\s=>/"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*\/?>/g;
const ATTR = /\s+([^\s=>/"']+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?/g;

// The output holds no markup that came from a person: no script, no xss-* tag, no tag with an event attribute.
export function assertNoMarkup(label, output) {
  assert.equal(typeof output, 'string', `${label}: the output is not a string`);
  assert.doesNotMatch(output, /<script/i, `${label}: a script tag from a person is in the output`);
  assert.doesNotMatch(output, /<xss-/i, `${label}: a tag from a person is in the output`);
  assert.doesNotMatch(output, /<img/i, `${label}: an img tag from a person is in the output`);
  for (const tag of output.matchAll(TAG)) {
    for (const attr of tag[1].matchAll(ATTR)) assert.ok(!/^on/i.test(attr[1]), `${label}: an event attribute from a person is in the output: ${tag[0]}`);
  }
}

const ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
// Decodes the character references of HTML and XML, once.
export function decodeOnce(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, ref) => {
    if (ref[0] === '#') return String.fromCodePoint(ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : Number(ref.slice(1)));
    return ENTITY[ref.toLowerCase()] ?? all;
  });
}

const okPage = (label, res) => {
  assert.equal(res.status, 200, `${label}: status ${res.status}`);
  return res.body;
};

export function checkPage(env, text) {
  const id = env.post(text);
  assertNoMarkup(`page ${text}`, okPage(`page ${text}`, env.outputs.page(id)));
}

export function checkSearch(env, text) {
  env.post(text);
  assertNoMarkup(`search ${text}`, okPage(`search ${text}`, env.outputs.search(text)));
}

export function checkFeed(env, text) {
  env.post(text);
  assertNoMarkup(`feed ${text}`, okPage(`feed ${text}`, env.outputs.feed()));
}

export function checkDigest(env, text) {
  env.post(text);
  assertNoMarkup(`digest ${text}`, env.digest());
}

export function defineAttackTests({ createApp }) {
  test('attack: text that looks like markup stays text on the recipe page and the search page', T, () => {
    for (const text of PAYLOADS) {
      checkPage(makeEnv(createApp), text);
      checkSearch(makeEnv(createApp), text);
    }
  });

  test('attack: text that looks like markup stays text in the feed and the digest', T, () => {
    for (const text of PAYLOADS) {
      checkFeed(makeEnv(createApp), text);
      checkDigest(makeEnv(createApp), text);
    }
  });
}
