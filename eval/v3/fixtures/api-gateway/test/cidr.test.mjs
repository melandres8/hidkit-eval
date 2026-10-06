import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inCidr, ipToInt, matchesAny } from '../src/lib/cidr.mjs';

test('ipToInt reads IPv4 and rejects other text', () => {
  assert.equal(ipToInt('10.0.0.1'), 167772161);
  assert.equal(ipToInt('::ffff:10.0.0.1'), 167772161);
  assert.equal(ipToInt('unknown'), null);
  assert.equal(ipToInt('1.2.3.256'), null);
});

test('inCidr checks a range and a single address', () => {
  assert.ok(inCidr('10.20.30.40', '10.0.0.0/8'));
  assert.ok(!inCidr('11.0.0.1', '10.0.0.0/8'));
  assert.ok(inCidr('192.168.1.1', '192.168.1.1'));
  assert.ok(!inCidr('192.168.1.2', '192.168.1.1'));
});

test('matchesAny checks a list', () => {
  assert.ok(matchesAny('192.168.1.1', ['10.0.0.0/8', '192.168.1.1']));
  assert.ok(!matchesAny('8.8.8.8', ['10.0.0.0/8']));
});
