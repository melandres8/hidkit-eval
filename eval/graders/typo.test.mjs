import { test } from 'node:test';
import assert from 'node:assert/strict';

const dir = process.env.CANDIDATE_DIR;
const { MESSAGES } = await import(`${dir}/src/messages.mjs`);

test('the not-found message is spelled correctly', () => {
  assert.equal(MESSAGES.notFound, 'Not found');
});

test('only the message file and tests changed', () => {
  // The runner lists the changed files from its own git dir. It never trusts the .git dir of the candidate.
  const changed = (process.env.CHANGED_FILES ?? '').split('\n').filter(Boolean);
  assert.deepEqual(changed.filter((f) => f !== 'src/messages.mjs' && !f.startsWith('test/')), []);
});
