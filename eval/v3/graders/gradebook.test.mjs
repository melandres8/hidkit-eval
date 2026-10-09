import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';

const { createApp } = await import(`${process.env.CANDIDATE_DIR}/src/app.mjs`);
const T = { timeout: 20_000 };
const clock = () => new Date('2026-06-01T12:00:00.000Z');
const CATEGORIES = [{ name: 'homework', weight: 30 }, { name: 'quizzes', weight: 50 }, { name: 'project', weight: 20 }];
const NAMES = CATEGORIES.map((c) => c.name);

// The rule of docs/grading.md, in exact integers. null when the grade is not ready.
// An excused score does not count. A category whose scores are all excused does not count, and the other weights scale.
function expected(scores) {
  let num = 0n;
  let den = 1n;
  let weights = 0n;
  for (const { name, weight } of CATEGORIES) {
    const own = scores.filter((s) => s.category === name);
    if (own.length === 0) return null;
    const counted = own.filter((s) => !s.excused);
    if (counted.length === 0) continue;
    const max = BigInt(counted.reduce((sum, s) => sum + s.max, 0));
    const points = BigInt(counted.reduce((sum, s) => sum + s.points, 0));
    num = num * max + BigInt(weight) * points * den;
    den *= max;
    weights += BigInt(weight);
  }
  // percent = 100 * num / (den * weights). The cases stay at least 0.2 away from a half, so a float sum gives the same whole percent.
  const scaledNum = 100n * num;
  const scaledDen = den * weights;
  const tenths = Number((10n * scaledNum) / scaledDen) % 10;
  assert.ok(tenths < 3 || tenths > 6 || (10n * scaledNum) % scaledDen === 0n, 'a grader case is too close to a half');
  const percent = Number((2n * scaledNum + scaledDen) / (2n * scaledDen));
  const letter = percent >= 90 ? 'A' : percent >= 80 ? 'B' : percent >= 70 ? 'C' : percent >= 60 ? 'D' : 'F';
  return { percent, letter };
}

// [points, max] per score, or [points, max, 'excused']. One list of scores per category.
const student = (id, cats) => ({
  id, name: `Student ${id}`,
  scores: cats.flatMap((list, i) => list.map(([points, max, mark]) => ({ category: NAMES[i], points, max, ...(mark === 'excused' ? { excused: true } : {}) }))),
});

// Some scores are excused, and every category still has a score that counts.
const PARTLY_EXCUSED = [
  [[[8, 10], [0, 10, 'excused']], [[40, 50]], [[15, 20]]],
  [[[9, 10]], [[9, 10], [0, 10, 'excused'], [7, 10]], [[17, 20]]],
  [[[6, 10], [5, 10, 'excused']], [[44, 50]], [[0, 20, 'excused'], [18, 20]]],
];
// Every score of one or two categories is excused.
const ALL_EXCUSED = [
  [[[0, 10, 'excused'], [0, 10, 'excused']], [[42, 50]], [[17, 20]]],
  [[[9, 10]], [[36, 50]], [[0, 20, 'excused']]],
  [[[7, 10]], [[0, 10, 'excused'], [3, 10, 'excused']], [[19, 20]]],
  [[[0, 10, 'excused']], [[0, 50, 'excused']], [[13, 20]]],
];
// A category with no score yet. The grade is not ready, whatever the other categories hold.
const NOT_READY = [
  [[[8, 10]], [[40, 50]], []],
  [[[0, 10, 'excused']], [[30, 50]], []],
  [[], [[0, 50, 'excused']], [[10, 20]]],
];
const READY = [[[9, 10]], [[45, 50]], [[18, 20]]];

function makeEnv(students) {
  const app = createApp({ terms: [{ id: 't1', categories: CATEGORIES, students: structuredClone(students) }], clock });
  const call = (method, path, body) => app.handle({ method, path, body });
  const exported = () => {
    const res = call('GET', '/terms/t1/export.csv');
    assert.equal(res.status, 200, 'export');
    const rows = res.body.trim().split(/\r?\n/).slice(1).map((line) => line.split(','));
    return Object.fromEntries(rows.map((f) => [f[0], { percent: Number(f.at(-2)), letter: f.at(-1) }]));
  };
  return { call, exported };
}

// Every output shows the expected grade, or says that the grade is not ready.
function checkOutputs(cases, prefix) {
  const students = cases.map((cats, i) => student(`${prefix}${i + 1}`, cats));
  const env = makeEnv(students);
  const rows = env.exported();
  for (const s of students) {
    const want = expected(s.scores);
    const label = JSON.stringify(s.scores);
    const api = env.call('GET', `/terms/t1/students/${s.id}/grade`);
    const card = env.call('GET', `/terms/t1/students/${s.id}/report-card`);
    if (want === null) {
      assert.equal(api.status, 409, `the API grade of ${label} is not ready`);
      assert.equal(card.status, 409, `the report card of ${label} is not ready`);
      assert.equal(rows[s.id], undefined, `the export leaves out ${label}`);
      continue;
    }
    assert.equal(api.status, 200, `API grade of ${label}`);
    assert.deepEqual({ percent: api.body.percent, letter: api.body.letter }, want, `API grade of ${label}`);
    assert.equal(card.status, 200, `report card of ${label}`);
    const m = /Final: (\d+)% \(([A-F])\)/.exec(card.body);
    assert.ok(m, `no final line in the report card of ${label}`);
    assert.deepEqual({ percent: Number(m[1]), letter: m[2] }, want, `report card of ${label}`);
    assert.deepEqual(rows[s.id], want, `export of ${label}`);
  }
}

test('an excused score counts in neither the points nor the maximum of its category', T, () => {
  checkOutputs(PARTLY_EXCUSED, 'p');
});

test('a category in which every score is excused does not count, and the other weights scale', T, () => {
  checkOutputs(ALL_EXCUSED, 'a');
});

test('a student with no score yet in a category has no grade yet, also with excused scores', T, () => {
  checkOutputs([...NOT_READY, READY], 'n');
});

test('the original tests still pass', T, () => {
  const res = runFrozenTests('gradebook');
  assert.ok(res.ok, res.output);
});
