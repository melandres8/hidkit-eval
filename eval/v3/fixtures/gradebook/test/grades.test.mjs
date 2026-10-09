import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('the grade of a student', () => {
  const { call } = makeApp();
  assert.deepEqual(call('GET', '/terms/2026-spring/students/s1/grade').body, { student: 's1', percent: 90, letter: 'A' });
  assert.deepEqual(call('GET', '/terms/2026-spring/students/s3/grade').body, { student: 's3', percent: 71, letter: 'C' });
});

test('a new score changes the grade, and bad scores get 400', () => {
  const { call } = makeApp();
  assert.equal(call('POST', '/terms/2026-spring/students/s3/scores', { category: 'project', points: 20, max: 20 }).status, 201);
  assert.equal(call('GET', '/terms/2026-spring/students/s3/grade').body.percent, 75);
  assert.equal(call('POST', '/terms/2026-spring/students/s3/scores', { category: 'project', points: 21, max: 20 }).status, 400);
  assert.equal(call('POST', '/terms/2026-spring/students/s3/scores', { category: 'labs', points: 1, max: 20 }).status, 400);
  assert.equal(call('POST', '/terms/2026-spring/students/s3/scores', { category: 'quizzes', points: 0, max: 10, excused: 'yes' }).status, 400);
});

test('a teacher can mark a score as excused', () => {
  const { call } = makeApp();
  const res = call('POST', '/terms/2026-spring/students/s1/scores', { category: 'quizzes', points: 0, max: 10, excused: true });
  assert.equal(res.status, 201);
  assert.deepEqual(res.body, { category: 'quizzes', points: 0, max: 10, excused: true });
});

test('unknown names give 404', () => {
  const { call } = makeApp();
  assert.equal(call('GET', '/terms/x/students/s1/grade').status, 404);
  assert.equal(call('GET', '/terms/2026-spring/students/x/grade').status, 404);
});
