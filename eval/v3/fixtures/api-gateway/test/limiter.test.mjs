import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLimiter } from '../src/lib/limiter.mjs';

test('the limiter allows max requests and then refuses until the window ends', () => {
  const clock = { now: 0 };
  const limiter = createLimiter({ max: 2, windowSeconds: 10, clock: () => new Date(clock.now) });
  assert.equal(limiter.check('k').allowed, true);
  assert.equal(limiter.check('k').allowed, true);
  assert.equal(limiter.check('k').allowed, false);
  assert.equal(limiter.check('other').allowed, true);
  clock.now = 10_000;
  assert.equal(limiter.check('k').allowed, true);
});
