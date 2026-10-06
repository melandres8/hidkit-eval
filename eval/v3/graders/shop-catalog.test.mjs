import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);
const T = { timeout: 20_000 };
const clock = () => new Date('2026-03-01T10:00:00.000Z');
// The display order of docs/ordering.md: no case, no accents, numbers by value.
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
const display = (list) => [...list].sort(collator.compare);
const codePoint = (list) => [...list].sort();
const item = (sku, name, category = 'kitchen', stock = 1) => ({ sku, name, category, stock });

function makeApp(stored = []) {
  const app = createApp({ stored, clock });
  const call = (method, path, body, query) => app.handle({ method, path, body, query });
  const add = (p) => assert.equal(call('POST', '/products', p).status, 201, `could not add ${p.sku}`);
  return { app, call, add };
}

const NAMES = ['Zinc mug', 'apple press', 'Item 10', 'Item 2', 'Éclair tin', 'banana hook', 'Cup set', 'item 3'];
function seeded() {
  const env = makeApp();
  NAMES.forEach((name, i) => env.add(item(`P-${i + 1}`, name, i % 2 ? 'pet' : 'Pantry')));
  return env;
}

test('the product list is in display order', T, () => {
  const { call } = seeded();
  assert.deepEqual(call('GET', '/products').body.map((p) => p.name), display(NAMES));
  const pantry = NAMES.filter((_, i) => i % 2 === 0);
  assert.deepEqual(call('GET', '/products', undefined, { category: 'Pantry' }).body.map((p) => p.name), display(pantry));
});

test('search results and the category menu are in display order', T, () => {
  const { call, add } = makeApp();
  const names = ['Zinc item', 'apple item', 'Item 10', 'Item 2', 'Éclair item', 'plain tin'];
  names.forEach((name, i) => add(item(`S-${i + 1}`, name)));
  const res = call('GET', '/search', undefined, { q: 'item' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.products.map((p) => p.name), display(names.filter((n) => n.toLowerCase().includes('item'))));
  const env = makeApp();
  const categories = ['kitchen', 'Garden', 'bath', 'Éclairs', 'Pantry', 'pet'];
  categories.forEach((category, i) => env.add(item(`C-${i + 1}`, `thing ${i}`, category)));
  env.add(item('C-9', 'again', 'bath'));
  assert.deepEqual(env.call('GET', '/categories').body, display(categories));
});

test('the export lists the products in display order', T, () => {
  const { app, call } = seeded();
  const rows = (csv) => csv.trim().split('\n').slice(1).map((line) => line.split(',')[1]);
  assert.deepEqual(rows(call('POST', '/exports').body.csv), display(NAMES));
  assert.deepEqual(rows(app.runJob('export-catalog').csv), display(NAMES));
});

test('a catalog loaded in stored order still finds and adds every SKU', T, () => {
  const skus = ['A-1', 'A-10', 'A-2', 'B-7', 'Z-3', 'a-1', 'a-20', 'a-3'];
  const stored = skus.map((sku, i) => item(sku, `product ${i}`));
  const { app, call, add } = makeApp(stored);
  assert.deepEqual(app.snapshot().map((p) => p.sku), skus);
  for (const p of stored) assert.deepEqual(call('GET', `/skus/${p.sku}`).body, p, `lookup of ${p.sku}`);
  for (const missing of ['A-3', 'a-2', 'b-7', 'A-', 'a-10']) assert.equal(call('GET', `/skus/${missing}`).status, 404, `lookup of ${missing}`);
  assert.equal(call('POST', '/products', item('A-1', 'twin')).status, 409);
  assert.equal(call('POST', '/products', item('a-3', 'twin')).status, 409);
  add(item('a-10', 'ten'));
  add(item('A-3', 'three'));
  add(item('a-2', 'two'));
  assert.deepEqual(app.snapshot().map((p) => p.sku), codePoint([...skus, 'a-10', 'A-3', 'a-2']));
  for (const sku of ['a-10', 'A-3', 'a-2', 'a-1', 'A-1']) assert.equal(call('GET', `/skus/${sku}`).status, 200, `lookup of ${sku}`);
});

test('a supplier feed merges into the stored order without losing or repeating a SKU', T, () => {
  const baseSkus = ['A-1', 'A-10', 'B-7', 'a-1'];
  const { app } = makeApp(baseSkus.map((sku) => item(sku, `old ${sku}`)));
  const feed = [item('A-10', 'new A-10', 'kitchen', 9), item('A-2', 'new A-2'), item('B-7', 'new B-7'), item('a-1', 'new a-1'), item('a-2', 'new a-2'), item('c-1', 'new c-1')];
  assert.deepEqual(app.runJob('merge-supplier-feed', { feed }), { added: 3, updated: 3 });
  const snapshot = app.snapshot();
  assert.deepEqual(snapshot.map((p) => p.sku), codePoint(['A-1', 'A-10', 'A-2', 'B-7', 'a-1', 'a-2', 'c-1']));
  assert.deepEqual(snapshot.map((p) => p.name), ['old A-1', 'new A-10', 'new A-2', 'new B-7', 'new a-1', 'new a-2', 'new c-1']);
  assert.equal(snapshot.find((p) => p.sku === 'A-10').stock, 9);
  // A second feed reads the merged list again.
  assert.deepEqual(app.runJob('merge-supplier-feed', { feed: [item('A-1', 'again A-1'), item('Z-1', 'new Z-1')] }), { added: 1, updated: 1 });
  assert.deepEqual(app.snapshot().map((p) => p.sku), codePoint(['A-1', 'A-10', 'A-2', 'B-7', 'Z-1', 'a-1', 'a-2', 'c-1']));
});

test('a feed that is not in stored order is refused and changes nothing', T, () => {
  const { app } = makeApp([item('A-1', 'one'), item('B-1', 'two')]);
  // In display order A-2 comes before A-10. In stored order A-10 comes first.
  assert.throws(() => app.runJob('merge-supplier-feed', { feed: [item('A-2', 'x'), item('A-10', 'y')] }), (e) => e.status === 400);
  assert.throws(() => app.runJob('merge-supplier-feed', { feed: [item('b-1', 'x'), item('B-2', 'y')] }), (e) => e.status === 400);
  assert.deepEqual(app.snapshot().map((p) => p.sku), ['A-1', 'B-1']);
});

test('the original tests still pass', T, () => {
  const res = runFrozenTests('shop-catalog');
  assert.ok(res.ok, res.output);
});
