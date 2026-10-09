import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('a report card lists the categories and the final grade', () => {
  const { call } = makeApp();
  const res = call('GET', '/terms/2026-spring/students/s3/report-card');
  assert.equal(res.status, 200);
  assert.equal(res.body, 'Report card 2026-spring\nStudent: Cleo Diaz\nhomework: 80%\nquizzes: 70%\nproject: 60%\nFinal: 71% (C)\n');
});
