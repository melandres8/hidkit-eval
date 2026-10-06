import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('the grade of a student in an open term', () => {
  const { call } = makeApp();
  assert.deepEqual(call('GET', '/terms/2026-spring/students/s1/grade').body, { student: 's1', percent: 90, letter: 'A' });
  assert.deepEqual(call('GET', '/terms/2026-spring/students/s3/grade').body, { student: 's3', percent: 71, letter: 'C' });
});

test('a closed term shows the stored grade', () => {
  const { call } = makeApp();
  assert.deepEqual(call('GET', '/terms/2025-fall/students/s2/grade').body, { student: 's2', percent: 66, letter: 'D' });
});

test('a new score changes the grade, and a closed term takes no score', () => {
  const { call } = makeApp();
  assert.equal(call('POST', '/terms/2026-spring/students/s3/scores', { category: 'project', points: 20, max: 20 }).status, 201);
  assert.equal(call('GET', '/terms/2026-spring/students/s3/grade').body.percent, 75);
  assert.equal(call('POST', '/terms/2025-fall/students/s1/scores', { category: 'exams', points: 1, max: 10 }).status, 409);
  assert.equal(call('POST', '/terms/2026-spring/students/s3/scores', { category: 'project', points: 21, max: 20 }).status, 400);
  assert.equal(call('POST', '/terms/2026-spring/students/s3/scores', { category: 'labs', points: 1, max: 20 }).status, 400);
});

test('a category with no score yet gives 409, and unknown names give 404', () => {
  const terms = [{ id: 't', closed: false, categories: [{ name: 'a', weight: 50 }, { name: 'b', weight: 50 }], students: [{ id: 's', name: 'S', scores: [{ category: 'a', points: 1, max: 2 }] }] }];
  const { call } = makeApp(terms);
  assert.equal(call('GET', '/terms/t/students/s/grade').status, 409);
  assert.equal(call('GET', '/terms/x/students/s/grade').status, 404);
  assert.equal(call('GET', '/terms/t/students/x/grade').status, 404);
});
