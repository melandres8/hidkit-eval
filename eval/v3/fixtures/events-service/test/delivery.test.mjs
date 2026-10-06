import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('an event goes to each subscription that matches its type', async () => {
  const { call, sent } = makeApp();
  await call('POST', '/subscriptions', { url: 'https://hooks.example.test/all' });
  await call('POST', '/subscriptions', { url: 'https://hooks.example.test/orders', types: ['order.created'] });
  await call('POST', '/subscriptions', { url: 'https://hooks.example.test/users', types: ['user.created'] });
  await call('POST', '/events', { type: 'order.created', data: { id: 1 } });
  assert.deepEqual(sent.map((r) => r.url).sort(), ['https://hooks.example.test/all', 'https://hooks.example.test/orders']);
});

test('the request is a JSON body with the event type header and an idempotency key', async () => {
  const { call, sent } = makeApp();
  await call('POST', '/subscriptions', { url: 'https://hooks.example.test/a' });
  const event = (await call('POST', '/events', { type: 'order.created', data: { id: 1 } })).body;
  assert.equal(sent.length, 1);
  assert.equal(sent[0].headers['Content-Type'], 'application/json');
  assert.equal(sent[0].headers['X-Event-Type'], 'order.created');
  assert.ok(sent[0].headers['Idempotency-Key']);
  assert.deepEqual(JSON.parse(sent[0].body).data, { id: 1 });
  assert.equal(JSON.parse(sent[0].body).id, event.id);
});

test('a delivered event is marked delivered', async () => {
  const { app, call } = makeApp();
  await call('POST', '/subscriptions', { url: 'https://hooks.example.test/a' });
  await call('POST', '/events', { type: 'ping', data: {} });
  const [delivery] = app.deliveries.list();
  assert.equal(delivery.status, 'delivered');
  assert.equal(delivery.attempts, 1);
  assert.equal((await call('GET', `/deliveries/${delivery.id}`)).body.status, 'delivered');
});

test('an unknown delivery is 404', async () => {
  const { call } = makeApp();
  assert.equal((await call('GET', '/deliveries/dlv_404')).status, 404);
});
