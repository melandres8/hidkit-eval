import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('the export has one line per student', () => {
  const { call } = makeApp();
  const res = call('GET', '/terms/2026-spring/export.csv');
  assert.match(res.headers['content-type'], /text\/csv/);
  assert.equal(res.body, 'student,name,percent,letter\ns1,Ada Park,90,A\ns3,Cleo Diaz,71,C\n');
  assert.equal(call('GET', '/terms/2025-fall/export.csv').body, 'student,name,percent,letter\ns1,Ada Park,87,B\ns2,Ben Ortiz,66,D\n');
});

test('the export leaves out a student with a missing category and guards formulas', () => {
  const terms = [{ id: 't', closed: false, categories: [{ name: 'a', weight: 100 }], students: [
    { id: 's1', name: '=SUM(A1)', scores: [{ category: 'a', points: 1, max: 2 }] },
    { id: 's2', name: 'Late, Lee', scores: [] },
  ] }];
  const { app } = makeApp(terms);
  assert.equal(app.runJob('export-grades', { term: 't' }).csv, "student,name,percent,letter\ns1,'=SUM(A1),50,F\n");
});

test('closing a term stores the grades and keeps them', () => {
  const { app, call } = makeApp();
  assert.deepEqual(call('POST', '/terms/2026-spring/close').body, { term: '2026-spring', students: 2 });
  assert.deepEqual(call('GET', '/terms/2026-spring/students/s3/grade').body, { student: 's3', percent: 71, letter: 'C' });
  assert.equal(call('POST', '/terms/2026-spring/students/s3/scores', { category: 'project', points: 20, max: 20 }).status, 409);
  assert.throws(() => app.runJob('close-term', { term: '2026-spring' }), { status: 409 });
});
