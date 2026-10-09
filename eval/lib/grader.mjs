// Runs one grader file against a candidate dir. run.mjs and eval/v2/validate.mjs share it,
// so the validation checks the same invocation that the eval scores.
import { tapResults } from './harness.mjs';
import { sandboxedNode } from './isolation.mjs';

// A grader imports the modules of the candidate, so it runs in the sandbox: no network, writes only to the candidate dir.
// A test timeout cannot stop a synchronous endless loop, so the whole grader process has a time limit too.
// A grader that hits it counts as a failure of the candidate, not as a harness error.
// changed lists the files that the candidate changed, from the host git dir, one per line in CHANGED_FILES.
export function runGrader(graderPath, { evalDir, candidateDir, baseRef = '', changed = [], timeoutMs = 300_000 }) {
  // A parent node --test sets NODE_TEST_CONTEXT, which would switch the child away from TAP output.
  const { NODE_TEST_CONTEXT, ...env } = process.env;
  const res = sandboxedNode(['--test', '--test-isolation=none', '--test-reporter=tap', graderPath], {
    cwd: evalDir, env: { ...env, CANDIDATE_DIR: candidateDir, BASE_REF: baseRef, CHANGED_FILES: changed.join('\n') }, writable: [candidateDir], timeout: timeoutMs,
  });
  if (res.error?.code === 'ETIMEDOUT') {
    return { passed: false, timedOut: true, results: tapResults(res.stdout ?? ''), tap: res.stdout ?? '', stderr: res.stderr ?? '' };
  }
  if (res.error || res.status === null) throw new Error(`grader ${graderPath} did not run: ${res.error?.message ?? res.signal}`);
  return { passed: res.status === 0, timedOut: false, results: tapResults(res.stdout ?? ''), tap: res.stdout ?? '', stderr: res.stderr ?? '' };
}
