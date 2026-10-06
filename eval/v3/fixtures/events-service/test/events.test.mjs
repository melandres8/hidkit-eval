import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('POST /events stores the event and returns it', async () => {
  const { call } = makeApp();
  const res = await call('POST', '/events', { type: 'invoice.paid', data: { invoice: 'inv_9' } });
  assert.equal(res.status, 201);
  assert.equal(res.body.type, 'invoice.paid');
  const fetched = await call('GET', `/events/${res.body.id}`);
  assert.equal(fetched.status, 200);
  assert.deepEqual(fetched.body.data, { invoice: 'inv_9' });
});

test('POST /events needs a type', async () => {
  const { call } = makeApp();
  assert.equal((await call('POST', '/events', { data: {} })).status, 400);
});

test('an unknown event is 404', async () => {
  const { call } = makeApp();
  assert.equal((await call('GET', '/events/evt_404')).status, 404);
});

test('a posted event does not fail when the endpoint is down', async () => {
  const { call, sent } = makeApp({ reply: () => 503 });
  await call('POST', '/subscriptions', { url: 'https://hooks.example.test/a' });
  const res = await call('POST', '/events', { type: 'ping', data: {} });
  assert.equal(res.status, 201);
  assert.ok(sent.length >= 1);
});
