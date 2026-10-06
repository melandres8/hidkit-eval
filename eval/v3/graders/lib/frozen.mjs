// Runs the original tests of a fixture against the candidate code.
// The tests come from eval/v3/fixtures, so a candidate that edits its own copy of them changes nothing here.
// The work happens in a temp dir of the grader. The candidate dir is only read.
// The child time limit stays below the 20 s test timeout, because spawnSync blocks the test timer.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));
const SKIP = new Set(['.git', 'node_modules', 'test']);

// skip lists test names to leave out. A frozen test must not pin an internal choice that a correct fix may change.
// A skip matches by exact name. If the fixture test is renamed, the skip matches nothing; the alt-store-soft-delete row of the validator guards it.
// --test-skip-pattern needs Node 22.1 or later. Node 20 would ignore it silently, so a skip on an older Node throws.
// The default is an empty list, so a grader that passes no skip runs every test.
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function runFrozenTests(fixture, candidateDir = process.env.CANDIDATE_DIR, { skip = [] } = {}) {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (skip.length && (major < 22 || (major === 22 && minor < 1))) throw new Error(`a frozen-test skip needs Node 22.1 or later, not ${process.version}`);
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'frozen-')));
  try {
    for (const entry of fs.readdirSync(candidateDir)) {
      if (!SKIP.has(entry)) fs.cpSync(path.join(candidateDir, entry), path.join(tmp, entry), { recursive: true });
    }
    const testDir = path.join(FIXTURES, fixture, 'test');
    fs.cpSync(testDir, path.join(tmp, 'test'), { recursive: true });
    const files = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.mjs')).map((f) => path.join('test', f));
    const { NODE_TEST_CONTEXT, ...env } = process.env;
    const res = spawnSync(process.execPath, ['--test', '--test-isolation=none', ...skip.map((name) => `--test-skip-pattern=^${escapeRegExp(name)}$`), ...files], { cwd: tmp, encoding: 'utf8', env, timeout: 15_000, killSignal: 'SIGKILL' });
    return { ok: res.status === 0, output: `${res.stdout ?? ''}${res.stderr ?? ''}${res.error ? res.error.message : ''}` };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
