import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);
const T = { timeout: 20_000 };

function makeApp() {
  const events = [];
  const app = createApp({ clock: () => new Date('2026-03-01T10:00:00Z'), transport: { send: (event) => events.push(event) } });
  const call = (method, path, body, query) => app.handle({ method, path, body, query });
  return { app, events, call };
}

function captured(call, amount, currency) {
  const created = call('POST', '/payments', { amount, currency });
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.equal(call('POST', `/payments/${id}/captures`).status, 201);
  return id;
}

// The refund route is a plural sub-resource of the payment (docs/api.md). A singular name is accepted too.
function refund(call, id, amount) {
  let res = call('POST', `/payments/${id}/refunds`, { amount });
  if (res.status === 404) res = call('POST', `/payments/${id}/refund`, { amount });
  return res;
}
const accepted = (res) => assert.ok([200, 201].includes(res.status), `expected 200 or 201, got ${res.status}`);
const rejected = (res) => assert.ok(res.status >= 400 && res.status < 500, `expected a 4xx status, got ${res.status}`);

const leaves = (value) => (value !== null && typeof value === 'object' ? Object.values(value).flatMap(leaves) : [value]);
const cells = (text) => text.trim().split('\n').map((line) => line.split(','));

test('a refund never exceeds the captured amount minus earlier refunds', T, () => {
  const { call } = makeApp();
  const id = captured(call, '10.00', 'USD');
  rejected(refund(call, id, '10.01'));
  accepted(refund(call, id, '6.00'));
  rejected(refund(call, id, '4.01'));
  accepted(refund(call, id, '4.00'));
  rejected(refund(call, id, '0.01'));
  // Money that was never captured cannot be refunded.
  const open = call('POST', '/payments', { amount: '5.00', currency: 'USD' }).body.id;
  rejected(refund(call, open, '1.00'));
});

test('refund amounts use the minor units of the currency', T, () => {
  const { call } = makeApp();
  const yen = captured(call, '500', 'JPY');
  accepted(refund(call, yen, '200'));
  rejected(refund(call, yen, '301'));
  accepted(refund(call, yen, '300'));
  rejected(refund(call, yen, '1'));
  const dinar = captured(call, '5.000', 'KWD');
  accepted(refund(call, dinar, '1.250'));
  rejected(refund(call, dinar, '3.751'));
  accepted(refund(call, dinar, '3.750'));
  rejected(refund(call, dinar, '0.001'));
});

test('the ledger records each refund as its own entry', T, () => {
  const { app, call } = makeApp();
  const id = captured(call, '10.00', 'USD');
  accepted(refund(call, id, '2.50'));
  const entries = app.ledger.entries({ paymentId: id });
  assert.equal(entries.length, 2);
  assert.equal(Math.abs(entries[1].amount), 250);
  assert.equal(app.ledger.balance('USD'), 750);
  accepted(refund(call, id, '1.00'));
  assert.equal(app.ledger.entries({ paymentId: id }).length, 3);
  assert.equal(app.ledger.balance('USD'), 650);
});

test('the CSV report shows the refund in major units', T, () => {
  const { call } = makeApp();
  const usd = captured(call, '10.00', 'USD');
  const yen = captured(call, '5000', 'JPY');
  const dinar = captured(call, '5.000', 'KWD');
  accepted(refund(call, usd, '1.25'));
  accepted(refund(call, yen, '1200'));
  accepted(refund(call, dinar, '1.250'));
  const res = call('GET', '/reports/payments.csv');
  assert.equal(res.status, 200);
  const rows = cells(res.body);
  for (const [id, shown] of [[usd, '1.25'], [yen, '1200'], [dinar, '1.250']]) {
    assert.ok(rows.some((row) => row.includes(id) && row.includes(shown)), `no row of ${id} shows ${shown}`);
  }
});

test('the webhook payload shows the refund in minor units', T, () => {
  const { events, call } = makeApp();
  const usd = captured(call, '10.00', 'USD');
  const yen = captured(call, '5000', 'JPY');
  const dinar = captured(call, '5.000', 'KWD');
  const before = events.length;
  accepted(refund(call, usd, '1.25'));
  accepted(refund(call, yen, '1200'));
  accepted(refund(call, dinar, '1.250'));
  const fresh = events.slice(before);
  for (const [id, minor] of [[usd, 125], [yen, 1200], [dinar, 1250]]) {
    assert.ok(fresh.some((e) => leaves(e.data).includes(id) && leaves(e.data).includes(minor)), `no event of ${id} holds ${minor}`);
  }
});

test('the settlement job pays out the net of the refunds', T, () => {
  const { app, call } = makeApp();
  const usd = captured(call, '10.00', 'USD');
  const yen = captured(call, '5000', 'JPY');
  captured(call, '4.000', 'KWD');
  call('POST', '/payments', { amount: '9.00', currency: 'USD' });
  accepted(refund(call, usd, '2.50'));
  accepted(refund(call, yen, '1200'));
  assert.deepEqual(app.runJob('settlement').payouts, { USD: 750, JPY: 3800, KWD: 4000 });
});

test('the original tests still pass', T, () => {
  const res = runFrozenTests('payments-service');
  assert.ok(res.ok, res.output);
});
