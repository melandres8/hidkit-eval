import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);
const T = { timeout: 20_000 };
const clock = () => new Date('2026-06-01T12:00:00.000Z');
const CATEGORIES = [{ name: 'homework', weight: 30 }, { name: 'quizzes', weight: 50 }, { name: 'project', weight: 20 }];
const NAMES = CATEGORIES.map((c) => c.name);

// The rule of docs/grading.md, in exact integers: sum of weight * points / max, rounded once, a half up.
function expected(scores) {
  let num = 0n;
  let den = 1n;
  for (const { name, weight } of CATEGORIES) {
    const own = scores.filter((s) => s.category === name);
    const max = BigInt(own.reduce((sum, s) => sum + s.max, 0));
    const points = BigInt(own.reduce((sum, s) => sum + s.points, 0));
    num = num * max + BigInt(weight) * points * den;
    den *= max;
  }
  const percent = Number((2n * num + den) / (2n * den));
  const letter = percent >= 90 ? 'A' : percent >= 80 ? 'B' : percent >= 70 ? 'C' : percent >= 60 ? 'D' : 'F';
  return { percent, letter };
}

// [points, max] per category. A pair of pairs is two scores in one category.
const student = (id, cats) => ({
  id, name: `Student ${id}`,
  scores: cats.flatMap((cat, i) => (Array.isArray(cat[0]) ? cat : [cat]).map(([points, max]) => ({ category: NAMES[i], points, max }))),
});

// Rounding each category first gives another percent. No float sum misses here.
const ROUND_ONCE = [
  [[11, 30], [49, 60], [11, 12]],
  [[[8, 10], [12, 20]], [55, 60], [2, 12]],
  [[28, 30], [[6, 20], [8, 40]], [12, 12]],
  [[22, 30], [44, 60], [[5, 6], [7, 6]]],
];
// The exact final percent ends in .5. A float sum lands just below the half. Rounding each category first gives the right answer here.
const EXACT_HALF = [
  [[[5, 6], [6, 6]], [[9, 10], [5, 5]], [4, 15]],
  [[11, 12], [11, 15], [4, 15]],
  [[13, 15], [59, 60], [43, 60]],
];

function makeApp(students, { closed = false } = {}) {
  const terms = [{ id: 't1', closed, categories: CATEGORIES, students }];
  const app = createApp({ terms, clock });
  const call = (method, path, body) => app.handle({ method, path, body });
  return {
    app,
    api: (id) => {
      const res = call('GET', `/terms/t1/students/${id}/grade`);
      assert.equal(res.status, 200, `grade of ${id}`);
      return { percent: res.body.percent, letter: res.body.letter };
    },
    card: (id) => {
      const res = call('GET', `/terms/t1/students/${id}/report-card`);
      assert.equal(res.status, 200, `report card of ${id}`);
      const m = /Final: (\d+)% \(([A-F])\)/.exec(res.body);
      assert.ok(m, `no final line in the report card of ${id}`);
      return { percent: Number(m[1]), letter: m[2] };
    },
    exported: () => {
      const res = call('GET', '/terms/t1/export.csv');
      assert.equal(res.status, 200, 'export');
      const rows = res.body.trim().split(/\r?\n/).slice(1).map((line) => line.split(','));
      return Object.fromEntries(rows.map((f) => [f[0], { percent: Number(f.at(-2)), letter: f.at(-1) }]));
    },
  };
}

function checkCardAndApi(cases) {
  const students = cases.map((cats, i) => student(`s${i + 1}`, cats));
  const env = makeApp(students);
  for (const s of students) {
    const want = expected(s.scores);
    assert.deepEqual(env.card(s.id), want, `report card of ${JSON.stringify(s.scores)}`);
    assert.deepEqual(env.api(s.id), want, `API grade of ${JSON.stringify(s.scores)}`);
  }
}

test('the final percent is rounded once, at the end, and not per category', T, () => {
  checkCardAndApi(ROUND_ONCE);
});

test('a final percent that is exactly a half goes up, with no float error', T, () => {
  checkCardAndApi(EXACT_HALF);
});

// A fixed generator, so every run sees the same class.
function generated() {
  let seed = 20260601;
  const next = (n) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % n;
  };
  const maxes = [10, 12, 15, 20, 30, 60];
  const out = [];
  for (let i = 0; i < 40; i++) {
    const cats = NAMES.map(() => Array.from({ length: 1 + next(3) }, () => {
      const max = maxes[next(maxes.length)];
      return [Math.min(max, Math.floor(max / 2) + next(max)), max];
    }));
    out.push(student(`g${i + 1}`, cats));
  }
  return [...out, ...[...ROUND_ONCE, ...EXACT_HALF].map((cats, i) => student(`k${i + 1}`, cats))];
}

test('the report card, the API and the export agree on the right grade for a whole class', T, () => {
  const students = generated();
  const env = makeApp(students);
  const rows = env.exported();
  for (const s of students) {
    const want = expected(s.scores);
    assert.deepEqual(env.card(s.id), want, `report card of ${s.id}`);
    assert.deepEqual(env.api(s.id), want, `API grade of ${s.id}`);
    assert.deepEqual(rows[s.id], want, `export of ${s.id}`);
  }
});

test('a closed term keeps its stored grades on every output', T, () => {
  const stored = [{ percent: 78, letter: 'C' }, { percent: 90, letter: 'A' }, { percent: 61, letter: 'D' }];
  const cases = [ROUND_ONCE[3], EXACT_HALF[2], ROUND_ONCE[2]];
  const students = cases.map((cats, i) => ({ ...student(`c${i + 1}`, cats), final: stored[i] }));
  const env = makeApp(students, { closed: true });
  const rows = env.exported();
  students.forEach((s, i) => {
    assert.deepEqual(env.api(s.id), stored[i], `API grade of ${s.id}`);
    assert.deepEqual(env.card(s.id), stored[i], `report card of ${s.id}`);
    assert.deepEqual(rows[s.id], stored[i], `export of ${s.id}`);
  });
});

test('the original tests still pass', T, () => {
  const res = runFrozenTests('gradebook');
  assert.ok(res.ok, res.output);
});
