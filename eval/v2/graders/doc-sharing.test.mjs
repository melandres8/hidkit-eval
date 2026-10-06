import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFrozenTests } from './lib/frozen.mjs';
import { defineAttackTests, sharedDoc } from './lib/doc-sharing-attacks.mjs';

const { createDocs } = await import(`${process.env.CANDIDATE_DIR}/src/docs.mjs`);
const { route } = await import(`${process.env.CANDIDATE_DIR}/src/routes.mjs`);
const T = { timeout: 20_000 };

test('the owner shares and the reader can read', T, () => {
  const { share, call } = sharedDoc({ createDocs, route });
  assert.ok([200, 201, 204].includes(share.status), `share answered ${share.status}`);
  const res = call('GET', 'bob');
  assert.equal(res.status, 200);
  assert.equal(res.body.title, 'Plan');
});

test('the owner keeps full access after a share', T, () => {
  const { docs, doc, call } = sharedDoc({ createDocs, route });
  assert.equal(call('GET', 'alice').status, 200);
  assert.equal(call('PATCH', 'alice', '', { body: 'v2' }).status, 200);
  assert.equal(docs.get(doc.id).body, 'v2');
  assert.ok([200, 204].includes(call('DELETE', 'alice').status));
  assert.equal(docs.get(doc.id), null);
});

defineAttackTests({ createDocs, route });

test('the original tests still pass', T, () => {
  const res = runFrozenTests('docs-api');
  assert.ok(res.ok, res.output);
});
