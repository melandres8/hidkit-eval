// Runs one grader file against a candidate dir. run.mjs and eval/v2/validate.mjs share it,
// so the validation checks the same invocation that the eval scores.
import { spawnSync } from 'node:child_process';
import { tapResults } from './harness.mjs';

// A test timeout cannot stop a synchronous endless loop, so the whole grader process has a time limit too.
// A grader that hits it counts as a failure of the candidate, not as a harness error.
export function runGrader(graderPath, { evalDir, candidateDir, baseRef = '', timeoutMs = 300_000 }) {
  // A parent node --test sets NODE_TEST_CONTEXT, which would switch the child away from TAP output.
  const { NODE_TEST_CONTEXT, ...env } = process.env;
  const res = spawnSync(process.execPath, ['--test', '--test-isolation=none', '--test-reporter=tap', graderPath], {
    cwd: evalDir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...env, CANDIDATE_DIR: candidateDir, BASE_REF: baseRef }, timeout: timeoutMs, killSignal: 'SIGKILL',
  });
  if (res.error?.code === 'ETIMEDOUT') {
    return { passed: false, timedOut: true, results: tapResults(res.stdout ?? ''), tap: res.stdout ?? '', stderr: res.stderr ?? '' };
  }
  if (res.error || res.status === null) throw new Error(`grader ${graderPath} did not run: ${res.error?.message ?? res.signal}`);
  return { passed: res.status === 0, timedOut: false, results: tapResults(res.stdout ?? ''), tap: res.stdout ?? '', stderr: res.stderr ?? '' };
}
