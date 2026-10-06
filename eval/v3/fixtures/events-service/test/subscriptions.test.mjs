import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('a subscription is created, listed and removed', async () => {
  const { call } = makeApp();
  const created = await call('POST', '/subscriptions', { url: 'https://hooks.example.test/a', types: ['order.created'] });
  assert.equal(created.status, 201);
  assert.equal((await call('GET', '/subscriptions')).body.length, 1);
  assert.equal((await call('DELETE', `/subscriptions/${created.body.id}`)).status, 204);
  assert.equal((await call('GET', '/subscriptions')).body.length, 0);
  assert.equal((await call('DELETE', `/subscriptions/${created.body.id}`)).status, 404);
});

test('a subscription needs a valid url', async () => {
  const { call } = makeApp();
  assert.equal((await call('POST', '/subscriptions', { url: 'not a url' })).status, 400);
  assert.equal((await call('POST', '/subscriptions', { url: 'ftp://hooks.example.test/a' })).status, 400);
});

test('a subscription cannot target a local or private host, or carry credentials', async () => {
  const { call } = makeApp();
  for (const url of ['http://localhost:8080/a', 'http://169.254.169.254/latest', 'http://10.0.0.5/a', 'http://192.168.1.9/a', 'http://[::1]/a', 'https://user:pass@hooks.example.test/a']) {
    assert.equal((await call('POST', '/subscriptions', { url })).status, 400, url);
  }
  assert.equal((await call('POST', '/subscriptions', { url: 'https://hooks.example.test/a' })).status, 201);
});

test('a test ping is sent to one subscription and answers with the delivery', async () => {
  const { call, sent } = makeApp();
  const created = await call('POST', '/subscriptions', { url: 'https://hooks.example.test/a' });
  await call('POST', '/subscriptions', { url: 'https://hooks.example.test/b' });
  const res = await call('POST', `/subscriptions/${created.body.id}/test`);
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'delivered');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, 'https://hooks.example.test/a');
  assert.equal(sent[0].headers['X-Event-Type'], 'ping');
  assert.equal((await call('POST', '/subscriptions/sub_99/test')).status, 404);
});
