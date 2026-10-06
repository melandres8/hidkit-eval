import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runFrozenTests } from './lib/frozen.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);
const T = { timeout: 20_000 };
const CLOCK = () => new Date('2026-03-01T10:00:00.000Z');
const SNAPSHOT = new URL('../fixtures/billing-app/data/invoices/', import.meta.url);

// The temp dirs of the grader. Each test removes its own.
function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'billing-grade-'));
}

function makeApp(seed) {
  const dir = tmpDir();
  const dataDir = path.join(dir, 'invoices');
  if (seed) fs.cpSync(seed, dataDir, { recursive: true });
  const app = createApp({ dataDir, clock: CLOCK });
  const call = (method, p, body) => app.handle({ method, path: p, body });
  return { app, call, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

const withApp = (body, seed) => () => {
  const ctx = makeApp(seed);
  try {
    return body(ctx);
  } finally {
    ctx.cleanup();
  }
};

// Reference math in exact integers. Half to even, tax once for each invoice (docs/billing.md).
function expected(invoice) {
  const subtotal = invoice.lines.reduce((sum, l) => sum + l.quantity * l.unitPriceMinor, 0);
  const scaled = subtotal * invoice.taxRateBps;
  const whole = Math.floor(scaled / 10000);
  const rest = scaled % 10000;
  const tax = rest * 2 === 10000 ? (whole % 2 === 0 ? whole : whole + 1) : rest * 2 > 10000 ? whole + 1 : whole;
  return { subtotal, tax, total: subtotal + tax };
}

const money = (minor) => `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;

// The three outputs of one invoice, as decimal strings.
function shown(call, id, number, csvRows) {
  const api = call('GET', `/invoices/${id}`).body.totals;
  const text = call('GET', `/invoices/${id}/pdf`).body;
  const pick = (label) => new RegExp(`^${label}[^:\\n]*:\\s*(-?\\d+\\.\\d\\d)\\s*$`, 'm').exec(text)?.[1];
  const row = csvRows.find((r) => r.number === number);
  return {
    api: { subtotal: money(api.subtotal), tax: money(api.tax), total: money(api.total) },
    pdf: { subtotal: pick('Subtotal'), tax: pick('Tax'), total: pick('Total') },
    csv: row && { subtotal: row.subtotal, tax: row.tax, total: row.total },
  };
}

function csvRows(call) {
  const res = call('GET', '/exports/invoices.csv');
  assert.equal(res.status, 200);
  const [header, ...rows] = res.body.trim().split('\n').map((line) => line.split(','));
  return rows.map((row) => Object.fromEntries(header.map((name, i) => [name, row[i]])));
}

const draft = (call, invoice) => {
  const res = call('POST', '/invoices', { customer: 'Test Customer', ...invoice });
  assert.equal(res.status, 201);
  return res.body;
};
const line = (quantity, unitPriceMinor) => ({ description: 'Item', quantity, unitPriceMinor });

function assertOutputs(call, created, want, label) {
  const out = shown(call, created.id, created.number, csvRows(call));
  const text = { subtotal: money(want.subtotal), tax: money(want.tax), total: money(want.total) };
  assert.deepEqual(out.api, text, `${label}: API`);
  assert.deepEqual(out.pdf, text, `${label}: document`);
  assert.deepEqual(out.csv, text, `${label}: CSV`);
}

test('line sums use exact minor units', T, withApp(({ call }) => {
  const cases = [
    [line(3, 1999)],
    [line(3, 1999), line(7, 1999), line(9, 2999)],
    [line(3, 1999), line(1, 5), line(7, 1099), line(6, 19999)],
    [line(9, 1999), line(9, 3999), line(7, 5999)],
  ];
  for (const lines of cases) {
    const invoice = { taxRateBps: 0, lines };
    assertOutputs(call, draft(call, invoice), expected(invoice), JSON.stringify(lines));
  }
}));

test('tax rounds once for each invoice, half to even', T, withApp(({ call }) => {
  const cases = [
    { taxRateBps: 125, lines: [line(1, 1000)] },
    { taxRateBps: 125, lines: [line(1, 3000)] },
    { taxRateBps: 1250, lines: [line(1, 10), line(1, 10), line(1, 10)] },
    { taxRateBps: 125, lines: [line(1, 1000), line(1, 1000), line(1, 1000), line(1, 1000)] },
    { taxRateBps: 825, lines: [line(3, 2000), line(2, 4500)] },
  ];
  assert.deepEqual(cases.map((c) => expected(c).tax), [12, 38, 4, 50, 1238]);
  for (const invoice of cases) {
    assertOutputs(call, draft(call, invoice), expected(invoice), JSON.stringify(invoice));
  }
}));

// A small seeded generator, so every run builds the same 50 invoices.
function generator(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('the document total, the API total and the CSV agree for 50 generated invoices', T, withApp(({ call }) => {
  const random = generator(20260301);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const prices = [1999, 333, 1250, 999, 4500, 7500, 2999, 10];
  const rates = [0, 500, 725, 825, 1000, 1250, 1900, 2000];
  const created = [];
  for (let i = 0; i < 50; i += 1) {
    const lines = Array.from({ length: 1 + Math.floor(random() * 6) }, () => line(1 + Math.floor(random() * 9), random() < 0.6 ? pick(prices) : 1 + Math.floor(random() * 20000)));
    created.push(draft(call, { taxRateBps: pick(rates), lines }));
  }
  const agree = (label) => {
    const rows = csvRows(call);
    for (const invoice of created) {
      const out = shown(call, invoice.id, invoice.number, rows);
      assert.deepEqual(out.pdf, out.api, `${label} ${invoice.number}: document and API`);
      assert.deepEqual(out.csv, out.api, `${label} ${invoice.number}: CSV and API`);
    }
  };
  agree('draft');
  const before = created.map((c) => call('GET', `/invoices/${c.id}`).body.totals);
  for (const invoice of created) assert.equal(call('POST', `/invoices/${invoice.id}/issue`).status, 200);
  agree('issued');
  // Issuing stores what the draft showed.
  assert.deepEqual(created.map((c) => call('GET', `/invoices/${c.id}`).body.totals), before);
}));

test('existing invoices keep their stored totals', T, withApp(({ call }) => {
  const stored = fs.readdirSync(SNAPSHOT).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(new URL(f, SNAPSHOT), 'utf8')));
  // The data folder of the candidate holds the same totals as the original.
  const dataDir = path.join(process.env.CANDIDATE_DIR, 'data', 'invoices');
  for (const invoice of stored) {
    const file = path.join(dataDir, `${invoice.id}.json`);
    assert.ok(fs.existsSync(file), `${invoice.id} is still in data/`);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).totals, invoice.totals, `${invoice.id} totals in the file`);
  }
  // Every output shows the stored totals of an issued invoice.
  const rows = csvRows(call);
  let checked = 0;
  for (const invoice of stored.filter((i) => i.status === 'issued')) {
    const text = { subtotal: money(invoice.totals.subtotal), tax: money(invoice.totals.tax), total: money(invoice.totals.total) };
    const out = shown(call, invoice.id, invoice.number, rows);
    assert.deepEqual(out.api, text, `${invoice.number}: API`);
    assert.deepEqual(out.pdf, text, `${invoice.number}: document`);
    assert.deepEqual(out.csv, text, `${invoice.number}: CSV`);
    checked += 1;
  }
  assert.ok(checked >= 5);
}, SNAPSHOT));

test('the original tests still pass', T, () => {
  const res = runFrozenTests('billing-app');
  assert.ok(res.ok, res.output);
});
