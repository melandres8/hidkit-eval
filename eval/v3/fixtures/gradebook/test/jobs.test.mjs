import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('the export has one line per student', () => {
  const { call } = makeApp();
  const res = call('GET', '/terms/2026-spring/export.csv');
  assert.match(res.headers['content-type'], /text\/csv/);
  assert.equal(res.body, 'student,name,percent,letter\ns1,Ada Park,90,A\ns3,Cleo Diaz,71,C\n');
});

test('the export guards formulas and quotes names', () => {
  const terms = [{ id: 't', categories: [{ name: 'a', weight: 100 }], students: [
    { id: 's1', name: '=SUM(A1)', scores: [{ category: 'a', points: 1, max: 2 }] },
    { id: 's2', name: 'Late, Lee', scores: [{ category: 'a', points: 2, max: 2 }] },
  ] }];
  const { app } = makeApp(terms);
  assert.equal(app.runJob('export-grades', { term: 't' }).csv, "student,name,percent,letter\ns1,'=SUM(A1),50,F\ns2,\"Late, Lee\",100,A\n");
});
