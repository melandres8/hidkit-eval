import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

const item = (sku, name, stock = 1) => ({ sku, name, category: 'kitchen', stock });

test('a feed adds new SKUs and replaces the SKUs that exist', () => {
  const { app } = makeApp([item('K-1', 'cup'), item('K-3', 'plate')]);
  const res = app.runJob('merge-supplier-feed', { feed: [item('K-1', 'big cup', 9), item('K-2', 'bowl'), item('K-4', 'tray')] });
  assert.deepEqual(res, { added: 2, updated: 1 });
  assert.deepEqual(app.snapshot().map((p) => [p.sku, p.name]), [['K-1', 'big cup'], ['K-2', 'bowl'], ['K-3', 'plate'], ['K-4', 'tray']]);
});

test('a feed that is not in stored order changes nothing', () => {
  const { app } = makeApp([item('K-1', 'cup')]);
  assert.throws(() => app.runJob('merge-supplier-feed', { feed: [item('K-3', 'tray'), item('K-2', 'bowl')] }), { status: 400 });
  assert.throws(() => app.runJob('merge-supplier-feed', { feed: 'x' }), { status: 400 });
  assert.deepEqual(app.snapshot().map((p) => p.sku), ['K-1']);
});

test('a merged catalog keeps working for lookups', () => {
  const { app, call } = makeApp([item('K-1', 'cup')]);
  app.runJob('merge-supplier-feed', { feed: [item('K-2', 'bowl')] });
  assert.equal(call('GET', '/skus/K-2').status, 200);
});
