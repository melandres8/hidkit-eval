import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFrozenTests } from './lib/frozen.mjs';

const ORIGINAL_BIN = fileURLToPath(new URL('../fixtures/todo-cli/bin/todo.mjs', import.meta.url));
const CANDIDATE_BIN = path.join(process.env.CANDIDATE_DIR, 'bin/todo.mjs');
const T = { timeout: 20_000 };
const TODOS = [
  { id: 1, title: 'Buy milk', done: false },
  { id: 2, title: 'Call "Ana", then Bo', done: true },
  { id: 7, title: 'Pay rent', done: false },
];

// Runs the CLI in a temp dir of the grader with its own todo file.
function todo(bin, args, todos) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'todo-')));
  try {
    const file = path.join(dir, 'todos.json');
    if (todos) fs.writeFileSync(file, JSON.stringify(todos));
    const { NODE_TEST_CONTEXT, ...env } = process.env;
    const res = spawnSync(process.execPath, [bin, ...args], { cwd: dir, encoding: 'utf8', env: { ...env, TODO_FILE: file }, timeout: 15_000 });
    return { code: res.status, stdout: res.stdout ?? '' };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('list --json prints the todos as a JSON array', T, () => {
  const res = todo(CANDIDATE_BIN, ['list', '--json'], TODOS);
  assert.equal(res.code, 0);
  const parsed = JSON.parse(res.stdout);
  assert.ok(Array.isArray(parsed));
  assert.equal(parsed.length, TODOS.length);
  for (const [i, want] of TODOS.entries()) {
    for (const key of ['id', 'title', 'done']) assert.deepEqual(parsed[i][key], want[key], `todo ${i} ${key}`);
  }
});

test('list without the flag prints the same text as before', T, () => {
  for (const todos of [TODOS, null]) {
    const before = todo(ORIGINAL_BIN, ['list'], todos);
    const after = todo(CANDIDATE_BIN, ['list'], todos);
    assert.equal(after.code, before.code);
    assert.equal(after.stdout, before.stdout);
  }
});

test('the original tests still pass', T, () => {
  const res = runFrozenTests('todo-cli');
  assert.ok(res.ok, res.output);
});
