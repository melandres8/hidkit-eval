import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACME, makeApp } from './helpers.mjs';

test('the export route returns a CSV with one row for each project', () => {
  const { app, call, project, task } = makeApp();
  const a = project(ACME, 'Website');
  project(ACME, 'Billing, new');
  task(ACME, a.id, 'Write copy');
  const res = call(ACME, 'POST', '/exports');
  assert.equal(res.status, 201);
  const lines = res.body.csv.trim().split('\n');
  assert.equal(lines[0], 'id,name,status,owner,tasks');
  assert.equal(lines.length, 3);
  assert.ok(lines.includes(`${a.id},Website,active,${ACME.userId},1`));
  assert.ok(lines.some((line) => line.includes('"Billing, new"')));
  const job = app.runJob('export-projects', { caller: ACME });
  assert.equal(job.filename, 'projects-t_acme.csv');
});

test('a project name that starts like a formula is exported as text', () => {
  const { call, project } = makeApp();
  project(ACME, '=HYPERLINK("http://example.test")');
  project(ACME, '-1+1');
  const { csv } = call(ACME, 'POST', '/exports').body;
  assert.ok(!/^[^,]*,=/m.test(csv) && !/^[^,]*,-1/m.test(csv));
  assert.ok(csv.includes(`'-1+1`));
});
