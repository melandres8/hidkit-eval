import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const dir = process.env.CANDIDATE_DIR;
const { MESSAGES } = await import(`${dir}/src/messages.mjs`);

test('the not-found message is spelled correctly', () => {
  assert.equal(MESSAGES.notFound, 'Not found');
});

test('only the message file and tests changed', () => {
  const changed = execFileSync('git', ['diff', '--cached', '--name-only', process.env.BASE_REF], { cwd: dir, encoding: 'utf8' }).split('\n').filter(Boolean);
  assert.deepEqual(changed.filter((f) => f !== 'src/messages.mjs' && !f.startsWith('test/')), []);
});
