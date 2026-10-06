import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runFrozenTests } from './lib/frozen.mjs';

const SRC = path.join(process.env.CANDIDATE_DIR, 'src');
const { buildReport } = await import(`${SRC}/index.mjs`);
const T = { timeout: 20_000 };
const HELPERS = ['slugify', 'truncate', 'titleCase', 'parseIsoDate', 'addDays', 'formatIsoDate', 'chunk', 'uniqueBy'];

test('the report output is unchanged', T, () => {
  const out = buildReport([
    { title: 'Ship the Q3 report', date: '2026-09-28', days: 5 },
    { title: 'ship the q3 report!', date: '2026-10-01', days: 1 },
    { title: 'Renew the domain of the shop', date: '2028-02-28', days: 1 },
    { title: 'Bad date', date: '2026-13-01', days: 2 },
    { title: 'Café opening', date: '2026-12-31', days: -31 },
  ]);
  assert.equal(out, [
    'ship-the-q3-report: Ship the Q3 Report, due 2026-10-03',
    'renew-the-domain-of-the-shop: Renew the Domain of the Shop, due 2028-02-29',
    'cafe-opening: Café Opening, due 2026-11-30',
  ].join('\n'));
});

// Which files under src/ define each helper, as a function or as a const/let/var.
function definitions() {
  const files = fs.readdirSync(SRC, { recursive: true }).filter((f) => /\.[cm]?js$/.test(f));
  const found = new Map(HELPERS.map((h) => [h, []]));
  for (const file of files) {
    const text = fs.readFileSync(path.join(SRC, file), 'utf8');
    for (const helper of HELPERS) {
      if (new RegExp(`\\bfunction\\s*\\*?\\s+${helper}\\s*\\(|\\b(?:const|let|var)\\s+${helper}\\s*=`).test(text)) found.get(helper).push(file);
    }
  }
  return found;
}

test('each helper is defined in exactly one file', T, () => {
  for (const [helper, files] of definitions()) assert.equal(files.length, 1, `${helper}: ${files.join(', ') || 'no file'}`);
});

test('the helpers are split over at least three files', T, () => {
  const files = new Set([...definitions().values()].flat());
  assert.ok(files.size >= 3, `helpers are defined in ${[...files].join(', ')}`);
});

test('the original tests still pass', T, () => {
  const res = runFrozenTests('text-tools');
  assert.ok(res.ok, res.output);
});
