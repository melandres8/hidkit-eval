import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';

const { createCheckout } = await import(`${process.env.CANDIDATE_DIR}/src/checkout.mjs`);
const { createStore } = await import(`${process.env.CANDIDATE_DIR}/src/store.mjs`);
const T = { timeout: 20_000 };

// A gateway whose charges wait for the grader. No timers: the grader resolves each pending charge by hand,
// in the order the gateway created them. A fix that runs one charge at a time still finishes.
function deferredGateway() {
  const calls = [];
  const pending = [];
  return {
    calls,
    pending,
    charge({ amountCents, cardToken }) {
      calls.push({ amountCents, cardToken });
      const id = `ch_${calls.length}`;
      return new Promise((resolve) => pending.push(() => resolve({ id, amountCents })));
    },
  };
}

// Starts the requests, then resolves charges until every request settles.
async function run(gateway, checkout, requests) {
  const settled = requests.map(() => false);
  const results = Promise.allSettled(requests.map((req, i) => checkout(req).finally(() => { settled[i] = true; })));
  for (let turn = 0; turn < 10_000 && settled.includes(false); turn += 1) {
    while (gateway.pending.length) gateway.pending.shift()();
    await Promise.resolve();
  }
  assert.ok(!settled.includes(false), 'a request never finished');
  return (await results).map((r) => {
    assert.equal(r.status, 'fulfilled', `a request failed: ${r.reason}`);
    return r.value;
  });
}

function setup() {
  const gateway = deferredGateway();
  return { gateway, checkout: createCheckout({ gateway, store: createStore() }) };
}

const req = (idempotencyKey) => ({ idempotencyKey, amountCents: 1250, cardToken: 'tok_visa' });

test('two requests with the same key at the same time charge once and get the same result', T, async () => {
  const { gateway, checkout } = setup();
  const [a, b] = await run(gateway, checkout, [req('key-1'), req('key-1')]);
  assert.equal(gateway.calls.length, 1);
  assert.equal(a.chargeId, 'ch_1');
  assert.deepEqual(b, a);
});

test('two different keys at the same time charge twice', T, async () => {
  const { gateway, checkout } = setup();
  const [a, b] = await run(gateway, checkout, [req('key-1'), req('key-2')]);
  assert.equal(gateway.calls.length, 2);
  assert.notEqual(a.chargeId, b.chargeId);
});

test('a retry after completion does not charge again', T, async () => {
  const { gateway, checkout } = setup();
  const [first] = await run(gateway, checkout, [req('key-1')]);
  const [again] = await run(gateway, checkout, [req('key-1')]);
  assert.equal(gateway.calls.length, 1);
  assert.deepEqual(again, first);
});

test('the original tests still pass', T, () => {
  const res = runFrozenTests('checkout-api');
  assert.ok(res.ok, res.output);
});
