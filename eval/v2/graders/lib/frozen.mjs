// Runs the original tests of a fixture against the candidate code.
// The tests come from eval/v2/fixtures, so a candidate that edits its own copy of them changes nothing here.
// The work happens in a temp dir of the grader. The candidate dir is only read.
// The child time limit stays below the 20 s test timeout, because spawnSync blocks the test timer.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));
const SKIP = new Set(['.git', 'node_modules', 'test']);

export function runFrozenTests(fixture, candidateDir = process.env.CANDIDATE_DIR) {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'frozen-')));
  try {
    for (const entry of fs.readdirSync(candidateDir)) {
      if (!SKIP.has(entry)) fs.cpSync(path.join(candidateDir, entry), path.join(tmp, entry), { recursive: true });
    }
    const testDir = path.join(FIXTURES, fixture, 'test');
    fs.cpSync(testDir, path.join(tmp, 'test'), { recursive: true });
    const files = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.mjs')).map((f) => path.join('test', f));
    const { NODE_TEST_CONTEXT, ...env } = process.env;
    const res = spawnSync(process.execPath, ['--test', '--test-isolation=none', ...files], { cwd: tmp, encoding: 'utf8', env, timeout: 15_000, killSignal: 'SIGKILL' });
    return { ok: res.status === 0, output: `${res.stdout ?? ''}${res.stderr ?? ''}${res.error ? res.error.message : ''}` };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
