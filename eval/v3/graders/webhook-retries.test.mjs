import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);
const T = { timeout: 20_000 };
const START = Date.parse('2026-03-01T10:00:00.000Z');
const URLS = { a: 'https://hooks.example.test/a', b: 'https://hooks.example.test/b', c: 'https://hooks.example.test/c', d: 'https://hooks.example.test/d', e: 'https://hooks.example.test/e' };

// reply({ url, n }) returns a status, or 'throw' for a network error. n counts the sends to that url.
function makeApp(reply) {
  let now = START;
  const sent = [];
  const counts = new Map();
  const transport = {
    async send(request) {
      const n = (counts.get(request.url) ?? 0) + 1;
      counts.set(request.url, n);
      const headers = Object.fromEntries(Object.entries(request.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
      sent.push({ url: request.url, headers, at: now - START, n, eventId: JSON.parse(request.body).id });
      const answer = reply({ url: request.url, n });
      if (answer === 'throw') throw new Error('connection reset');
      return { status: answer };
    },
  };
  const app = createApp({ clock: () => new Date(now), transport });
  const call = (method, path, body) => app.handle({ method, path, body });
  // Moves the clock in steps and runs the retry job after each step.
  const run = async (totalMs, stepMs = 500) => {
    for (let t = 0; t < totalMs; t += stepMs) {
      now += stepMs;
      await app.runJob('retry-deliveries');
    }
  };
  const jump = async (ms) => {
    now += ms;
    await app.runJob('retry-deliveries');
  };
  const subscribe = async (...urls) => {
    for (const url of urls) assert.equal((await call('POST', '/subscriptions', { url })).status, 201);
  };
  const post = async (type = 'order.created') => {
    const res = await call('POST', '/events', { type, data: { id: 1 } });
    assert.equal(res.status, 201);
    return res.body;
  };
  const sentTo = (url) => sent.filter((s) => s.url === url);
  const deadLetters = async () => {
    const res = await call('GET', '/dead-letters');
    if (res.status === 404) return null;
    assert.equal(res.status, 200);
    return Array.isArray(res.body) ? res.body : res.body.items;
  };
  return { app, call, sent, sentTo, run, jump, subscribe, post, deadLetters };
}

test('retries follow the backoff of 1, 2, 4 and 8 seconds', T, async () => {
  const failures = [503, 'throw', 429, 500];
  const env = makeApp(({ n }) => (n <= 4 ? failures[n - 1] : 200));
  await env.subscribe(URLS.a);
  await env.post();
  await env.run(40_000);
  assert.deepEqual(env.sent.map((s) => s.at), [0, 1000, 3000, 7000, 15000]);
});

test('the idempotency key is the same on every attempt of a delivery', T, async () => {
  const env = makeApp(() => 500);
  await env.subscribe(URLS.a, URLS.b);
  await env.post();
  await env.run(20_000);
  const keysA = env.sentTo(URLS.a).map((s) => s.headers['idempotency-key']);
  const keysB = env.sentTo(URLS.b).map((s) => s.headers['idempotency-key']);
  assert.ok(keysA.length >= 2 && keysB.length >= 2, 'both deliveries must be retried');
  assert.ok(keysA[0], 'the key is not empty');
  assert.equal(new Set(keysA).size, 1, 'one key for all attempts of delivery a');
  assert.equal(new Set(keysB).size, 1, 'one key for all attempts of delivery b');
  assert.notEqual(keysA[0], keysB[0], 'two deliveries never share a key');
  const second = await env.post('order.updated');
  await env.run(20_000);
  const later = env.sentTo(URLS.a).filter((s) => s.eventId === second.id).map((s) => s.headers['idempotency-key']);
  assert.ok(later.length >= 1);
  assert.ok(!later.includes(keysA[0]), 'a new event gets a new key');
});

test('a 4xx other than 429 does not retry', T, async () => {
  const answers = { [URLS.a]: 400, [URLS.b]: 404, [URLS.c]: 422, [URLS.e]: 401 };
  const env = makeApp(({ url, n }) => (url === URLS.d ? (n === 1 ? 429 : 200) : answers[url]));
  await env.subscribe(URLS.a, URLS.b, URLS.c, URLS.d, URLS.e);
  const event = await env.post();
  await env.run(40_000);
  await env.jump(3_600_000);
  for (const url of [URLS.a, URLS.b, URLS.c, URLS.e]) assert.equal(env.sentTo(url).length, 1, `${url} is sent once`);
  assert.equal(env.sentTo(URLS.d).length, 2, 'a 429 is retried and then succeeds');
  const dead = await env.deadLetters();
  assert.ok(!dead || !dead.some((item) => item.eventId === event.id), 'a permanent failure is not a dead letter');
});

test('the dead-letter list gets the delivery after the fifth attempt', T, async () => {
  const env = makeApp(({ url, n }) => (url === URLS.a ? 503 : url === URLS.b ? 200 : n < 5 ? 500 : 200));
  await env.subscribe(URLS.a, URLS.b, URLS.c);
  const event = await env.post();
  for (let i = 0; i < 120 && env.sentTo(URLS.a).length < 4; i += 1) await env.run(1000, 1000);
  assert.equal(env.sentTo(URLS.a).length, 4);
  assert.deepEqual(await env.deadLetters(), [], 'nothing is dead before the fifth attempt');
  await env.run(60_000, 1000);
  await env.jump(3_600_000);
  await env.jump(3_600_000);
  assert.equal(env.sentTo(URLS.a).length, 5, 'exactly five attempts');
  assert.equal(env.sentTo(URLS.b).length, 1);
  assert.equal(env.sentTo(URLS.c).length, 5);
  const dead = await env.deadLetters();
  assert.ok(Array.isArray(dead), 'GET /dead-letters returns the list');
  assert.equal(dead.length, 1, 'only the failing delivery is dead');
  assert.equal(dead[0].eventId, event.id);
  assert.equal(dead[0].url, URLS.a);
  assert.equal(dead[0].attempts, 5);
  assert.ok(dead[0].deliveryId);
});

test('removing a subscription stops its pending retries', T, async () => {
  const env = makeApp(() => 503);
  await env.subscribe(URLS.a, URLS.b);
  await env.post();
  await env.run(1000, 500);
  assert.equal(env.sentTo(URLS.a).length, 2);
  const list = await env.call('GET', '/subscriptions');
  const sub = list.body.find((item) => item.url === URLS.a);
  assert.equal((await env.call('DELETE', `/subscriptions/${sub.id}`)).status, 204);
  await env.run(40_000);
  assert.equal(env.sentTo(URLS.a).length, 2, 'no attempt after the removal');
  assert.ok(env.sentTo(URLS.b).length >= 5, 'the other subscription keeps its attempts');
  const dead = await env.deadLetters();
  assert.ok(!dead || !dead.some((item) => item.url === URLS.a), 'a removed subscription is not a dead letter');
});

test('a test ping is sent once and never retried or dead', T, async () => {
  const env = makeApp(() => 503);
  await env.subscribe(URLS.a, URLS.b);
  const list = await env.call('GET', '/subscriptions');
  const sub = list.body.find((item) => item.url === URLS.a);
  const res = await env.call('POST', `/subscriptions/${sub.id}/test`);
  assert.equal(res.status, 200);
  assert.equal(res.body.url, URLS.a);
  assert.equal(env.sentTo(URLS.a).length, 1, 'the ping goes out at once');
  assert.ok(env.sentTo(URLS.a)[0].headers['idempotency-key'], 'the ping has a key');
  assert.equal(env.sentTo(URLS.b).length, 0, 'the other subscription gets nothing');
  await env.run(40_000);
  await env.jump(3_600_000);
  assert.equal(env.sentTo(URLS.a).length, 1, 'a failed ping is not retried');
  const dead = await env.deadLetters();
  assert.ok(!dead || dead.length === 0, 'a ping is never a dead letter');
});

test('the original tests still pass', T, () => {
  const res = runFrozenTests('events-service');
  assert.ok(res.ok, res.output);
});
