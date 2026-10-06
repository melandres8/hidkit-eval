import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstRun, nextRun } from '../src/schedule/next-run.mjs';

const at = (iso) => Date.parse(iso);
const iso = (ms) => new Date(ms).toISOString();

test('the first run is today when the time is still ahead', () => {
  const job = { time: '09:00', zone: 'America/New_York' };
  assert.equal(iso(firstRun(job, at('2026-01-12T12:00:00Z'))), '2026-01-12T14:00:00.000Z');
});

test('the first run is tomorrow when the time has passed', () => {
  const job = { time: '09:00', zone: 'America/New_York' };
  assert.equal(iso(firstRun(job, at('2026-01-12T15:00:00Z'))), '2026-01-13T14:00:00.000Z');
});

test('the local date of the zone decides, not the date in UTC', () => {
  const job = { time: '08:00', zone: 'Asia/Tokyo' };
  assert.equal(iso(firstRun(job, at('2026-01-12T20:00:00Z'))), '2026-01-12T23:00:00.000Z');
});

test('in winter the next run is on the next day at the same local time', () => {
  const job = { time: '09:00', zone: 'Europe/Berlin' };
  assert.equal(iso(nextRun(job, at('2026-01-12T08:00:00Z'))), '2026-01-13T08:00:00.000Z');
});
