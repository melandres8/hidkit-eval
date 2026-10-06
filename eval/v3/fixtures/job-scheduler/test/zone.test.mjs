import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isKnownZone, localParts, offsetAt } from '../src/schedule/zone.mjs';

const HOUR = 3_600_000;

test('offsetAt follows the daylight saving rules of the zone', () => {
  assert.equal(offsetAt(Date.parse('2026-01-15T12:00:00Z'), 'America/New_York'), -5 * HOUR);
  assert.equal(offsetAt(Date.parse('2026-07-15T12:00:00Z'), 'America/New_York'), -4 * HOUR);
  assert.equal(offsetAt(Date.parse('2026-01-15T12:00:00Z'), 'Europe/Berlin'), HOUR);
  assert.equal(offsetAt(Date.parse('2026-07-15T12:00:00Z'), 'Europe/Berlin'), 2 * HOUR);
  assert.equal(offsetAt(Date.parse('2026-07-15T12:00:00Z'), 'Asia/Kolkata'), 5.5 * HOUR);
  assert.equal(offsetAt(Date.parse('2026-07-15T12:00:00Z'), 'UTC'), 0);
});

test('localParts gives the wall clock of the zone', () => {
  assert.deepEqual(localParts(Date.parse('2026-01-15T23:30:15Z'), 'Europe/Berlin'), { year: 2026, month: 1, day: 16, hour: 0, minute: 30, second: 15 });
});

test('isKnownZone accepts IANA names only', () => {
  assert.equal(isKnownZone('Australia/Sydney'), true);
  assert.equal(isKnownZone('Mars/Olympus'), false);
});
