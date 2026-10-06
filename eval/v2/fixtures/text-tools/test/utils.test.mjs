import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, buildReport, chunk, formatIsoDate, parseIsoDate, slugify, titleCase, truncate, uniqueBy } from '../src/index.mjs';

test('slugify', () => {
  assert.equal(slugify('Hello, World!'), 'hello-world');
  assert.equal(slugify('  Café Olé  '), 'cafe-ole');
});

test('truncate', () => {
  assert.equal(truncate('short', 10), 'short');
  assert.equal(truncate('the quick brown fox', 12), 'the quick…');
});

test('titleCase', () => {
  assert.equal(titleCase('the lord of the rings'), 'The Lord of the Rings');
});

test('dates', () => {
  assert.equal(parseIsoDate('2026-02-30'), null);
  assert.equal(formatIsoDate(addDays(parseIsoDate('2026-02-27'), 3)), '2026-03-02');
});

test('chunk and uniqueBy', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(uniqueBy([{ k: 1 }, { k: 1 }, { k: 2 }], (x) => x.k), [{ k: 1 }, { k: 2 }]);
});

test('report', () => {
  assert.equal(buildReport([{ title: 'pay the rent', date: '2026-01-30', days: 3 }]), 'pay-the-rent: Pay the Rent, due 2026-02-02');
});
