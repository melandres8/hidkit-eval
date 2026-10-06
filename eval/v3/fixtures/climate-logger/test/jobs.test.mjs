import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.mjs';

test('heat-alert lists the sensors that are above 30.00 for the day', () => {
  const { app, read } = makeApp();
  read('oven', '2026-03-01T10:00:00Z', '45');
  read('oven', '2026-03-01T10:30:00Z', '43');
  read('dock', '2026-03-01T10:00:00Z', '21');
  read('attic', '2026-03-01T11:00:00Z', '30.01');
  read('attic', '2026-03-01T11:30:00Z', '30.01');
  read('hall', '2026-03-02T11:00:00Z', '50');
  assert.deepEqual(app.runJob('heat-alert', { date: '2026-03-01' }), { date: '2026-03-01', alerts: ['attic', 'oven'] });
  assert.deepEqual(app.runJob('heat-alert', { date: '2026-03-03' }), { date: '2026-03-03', alerts: [] });
});

test('heat-alert needs a valid date', () => {
  const { app } = makeApp();
  assert.throws(() => app.runJob('heat-alert', {}), { status: 400 });
  assert.throws(() => app.runJob('heat-alert', { date: 'today' }), { status: 400 });
});
