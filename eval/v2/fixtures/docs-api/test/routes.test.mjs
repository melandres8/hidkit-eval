import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocs } from '../src/docs.mjs';
import { route } from '../src/routes.mjs';

function seeded() {
  const docs = createDocs();
  const doc = docs.create({ ownerId: 'alice', title: 'Plan', body: 'v1' });
  return { docs, doc };
}

test('the owner can read, edit and delete', () => {
  const { docs, doc } = seeded();
  assert.equal(route(docs, { method: 'GET', path: `/docs/${doc.id}`, user: 'alice' }).body.title, 'Plan');
  assert.equal(route(docs, { method: 'PATCH', path: `/docs/${doc.id}`, user: 'alice', body: { body: 'v2' } }).body.body, 'v2');
  assert.equal(route(docs, { method: 'DELETE', path: `/docs/${doc.id}`, user: 'alice' }).status, 204);
  assert.equal(docs.get(doc.id), null);
});

test('a stranger cannot delete', () => {
  const { docs, doc } = seeded();
  assert.equal(route(docs, { method: 'DELETE', path: `/docs/${doc.id}`, user: 'mallory' }).status, 403);
  assert.notEqual(docs.get(doc.id), null);
});
