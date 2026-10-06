import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.mjs';

test('the settlement job totals the captured amounts of each currency', () => {
  const app = createApp();
  const call = (method, path, body) => app.handle({ method, path, body });
  for (const [amount, currency] of [['10.00', 'USD'], ['5.50', 'USD'], ['500', 'JPY']]) {
    const { body } = call('POST', '/payments', { amount, currency });
    call('POST', `/payments/${body.id}/captures`);
  }
  call('POST', '/payments', { amount: '9.00', currency: 'USD' });
  assert.deepEqual(app.runJob('settlement'), { payouts: { USD: 1550, JPY: 500 } });
});

test('an unknown job name throws', () => {
  assert.throws(() => createApp().runJob('nope'), /unknown job/);
});
