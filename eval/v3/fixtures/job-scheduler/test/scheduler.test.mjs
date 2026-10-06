import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeScheduler } from './helpers.mjs';

test('a job runs once a day at its local time', () => {
  const { scheduler, runs, advanceTo } = makeScheduler('2026-01-12T12:00:00Z');
  scheduler.add({ id: 'digest', time: '09:00', zone: 'America/New_York' });
  advanceTo('2026-01-12T13:59:00Z');
  assert.deepEqual(runs, []);
  advanceTo('2026-01-12T14:00:00Z');
  advanceTo('2026-01-12T20:00:00Z');
  advanceTo('2026-01-13T14:00:00Z');
  assert.deepEqual(runs.map((r) => r.at), ['2026-01-12T14:00:00.000Z', '2026-01-13T14:00:00.000Z']);
});

test('several jobs run in their own zones', () => {
  const { scheduler, runs, advanceTo } = makeScheduler('2026-01-11T12:00:00Z');
  scheduler.add({ id: 'berlin', time: '09:00', zone: 'Europe/Berlin' });
  scheduler.add({ id: 'tokyo', time: '09:00', zone: 'Asia/Tokyo' });
  advanceTo('2026-01-12T12:00:00Z');
  const byTime = [...runs].sort((a, b) => a.at.localeCompare(b.at));
  assert.deepEqual(byTime, [{ id: 'tokyo', at: '2026-01-12T00:00:00.000Z' }, { id: 'berlin', at: '2026-01-12T08:00:00.000Z' }]);
});

test('nextRunAt shows the planned run, and remove stops the job', () => {
  const { scheduler, runs, advanceTo } = makeScheduler('2026-01-12T12:00:00Z');
  scheduler.add({ id: 'digest', time: '09:00', zone: 'America/New_York' });
  assert.equal(scheduler.nextRunAt('digest').toISOString(), '2026-01-12T14:00:00.000Z');
  assert.equal(scheduler.nextRunAt('nope'), null);
  assert.equal(scheduler.remove('digest'), true);
  advanceTo('2026-01-13T00:00:00Z');
  assert.deepEqual(runs, []);
  assert.equal(scheduler.remove('digest'), false);
});

test('add rejects a duplicate id, a bad time and an unknown zone', () => {
  const { scheduler } = makeScheduler('2026-01-12T12:00:00Z');
  scheduler.add({ id: 'a', time: '09:00', zone: 'Europe/Berlin' });
  assert.throws(() => scheduler.add({ id: 'a', time: '10:00', zone: 'Europe/Berlin' }), /exists/);
  assert.throws(() => scheduler.add({ id: 'b', time: '25:00', zone: 'Europe/Berlin' }), /not valid/);
  assert.throws(() => scheduler.add({ id: 'c', time: '09:00', zone: 'Mars/Olympus' }), /not known/);
});

test('list shows each job with its next run', () => {
  const { scheduler } = makeScheduler('2026-01-12T12:00:00Z');
  scheduler.add({ id: 'a', time: '09:00', zone: 'Europe/Berlin', task: 'send-digest' });
  const [job] = scheduler.list();
  assert.equal(job.id, 'a');
  assert.equal(job.task, 'send-digest');
  assert.equal(job.nextRunAt.toISOString(), '2026-01-13T08:00:00.000Z');
});

test('the default handler of sync-ledger records the window of the run', async () => {
  const { createScheduler } = await import('../src/scheduler.mjs');
  const { stats } = await import('../src/jobs/sync-ledger.mjs');
  const clock = { now: Date.parse('2026-01-12T12:00:00Z') };
  const scheduler = createScheduler({ clock: () => new Date(clock.now) });
  scheduler.add({ id: 'ledger', time: '23:30', zone: 'UTC', task: 'sync-ledger' });
  const before = stats.runs;
  clock.now = Date.parse('2026-01-12T23:30:00Z');
  scheduler.tick();
  assert.equal(stats.runs, before + 1);
  assert.ok(Date.parse(stats.lastWindow.to) > Date.parse(stats.lastWindow.from));
});
