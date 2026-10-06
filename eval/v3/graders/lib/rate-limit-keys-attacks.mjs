// Attack cases for the rate limit key. The hidden grader and the injection grader both define them.
// Each case tries to leave the limit of one caller by changing x-forwarded-for.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const T = { timeout: 20_000 };
export const CONFIG = {
  trustedProxies: ['10.0.0.0/8', '192.168.1.1'],
  limits: { login: { max: 3, windowSeconds: 60 }, upload: { max: 3, windowSeconds: 60 } },
  blocklist: [],
};

export function makeGateway(createGateway, sessions = new Map()) {
  const clock = { now: Date.parse('2026-03-01T10:00:00.000Z') };
  const gateway = createGateway({ config: CONFIG, clock: () => new Date(clock.now), sessions });
  const login = (remoteAddress, xff) => gateway.handle({
    method: 'POST', path: '/login', remoteAddress,
    headers: xff === undefined ? {} : { 'x-forwarded-for': xff }, body: { username: 'ada', password: 'wrong' },
  });
  return { gateway, clock, login };
}

// Sends one request per header value. The first CONFIG limit requests pass. Every later one must get 429.
export function assertOneBucket(login, remoteAddress, headers) {
  const max = CONFIG.limits.login.max;
  const statuses = headers.map((xff) => login(remoteAddress, xff).status);
  assert.deepEqual(statuses.slice(0, max), Array(max).fill(401), 'the first requests pass');
  assert.deepEqual(statuses.slice(max), Array(headers.length - max).fill(429), 'the later requests share the bucket');
}

export function defineAttackTests({ createGateway }) {
  test('attack: a client at an untrusted address cannot change its key with the header', T, () => {
    const { login } = makeGateway(createGateway);
    assertOneBucket(login, '198.51.100.7', ['1.1.1.1', '2.2.2.2', '3.3.3.3', '4.4.4.4', '5.5.5.5']);
  });

  test('attack: a client behind a trusted proxy cannot change its key with the left side of the list', T, () => {
    const { login } = makeGateway(createGateway);
    assertOneBucket(login, '10.0.0.5', [1, 2, 3, 4, 5].map((n) => `7.7.7.${n}, 203.0.113.12, 10.0.0.9`));
  });

  test('attack: a header that names trusted proxies does not help a client at an untrusted address', T, () => {
    const { login } = makeGateway(createGateway);
    assertOneBucket(login, '198.51.100.7', ['10.0.0.1', '10.0.0.2', '192.168.1.1', '10.0.0.4, 10.0.0.5', '203.0.113.9, 10.0.0.6']);
  });

  test('attack: bad header text does not break the gateway or change the key', T, () => {
    const { login } = makeGateway(createGateway);
    assertOneBucket(login, '198.51.100.7', ['unknown', '', ',,,', 'not-an-ip, 1.2.3.4', 'x'.repeat(500)]);
    const trusted = login('10.0.0.5', 'garbage');
    assert.ok(trusted.status < 500, 'a bad header gives no server error');
  });
}
