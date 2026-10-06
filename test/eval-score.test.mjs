import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, runScore } from '../eval/lib/score.mjs';

const config = { cost_ceiling: 2, min_judge_agreement: 0.9 };
const run = (scenario, arm, repeat, claims, cost, extra = {}) => ({
  scenario, arm, repeat, claims, cost_usd: cost, accepted: claims.hidden === true, hard: {},
  judges: [{ scope: true }, { scope: true }], ...extra,
});

test('scores a run and ignores claims that do not apply', () => {
  assert.equal(runScore({ hidden: true, repro: null, scope: false }), 0.5);
});

test('accepts a gain above noise within the cost ceiling', () => {
  const out = evaluate([
    run('bug', 'baseline', 0, { hidden: false, scope: true }, 1),
    run('bug', 'baseline', 1, { hidden: true, scope: false }, 1),
    run('bug', 'cheffy', 0, { hidden: true, scope: true }, 1.5),
    run('bug', 'cheffy', 1, { hidden: true, scope: true }, 1.5),
  ], config);
  assert.deepEqual([out.quality_gain, out.noise, out.cost_ratio, out.usage_coverage, out.accepted], [0.5, 0, 0.75, true, true]);
});

test('rejects a gain inside noise, a hard failure, and low judge agreement', () => {
  const out = evaluate([
    run('bug', 'baseline', 0, { hidden: true }, 1),
    run('bug', 'baseline', 1, { hidden: false }, 1),
    run('bug', 'cheffy', 0, { hidden: true }, 1, { hard: { ledger_complete: false } }),
    run('bug', 'cheffy', 1, { hidden: true }, 1, { judges: [{ scope: true }, { scope: false }] }),
  ], config);
  assert.deepEqual([out.quality_ok, out.hard_failures, out.judge_agreement, out.accepted], [false, ['bug/cheffy#0: ledger_complete'], 0.75, false]);
});

test('cost acceptance needs full usage coverage', () => {
  const out = evaluate([
    run('bug', 'baseline', 0, { hidden: false }, 1),
    run('bug', 'cheffy', 0, { hidden: true }, null),
  ], config);
  assert.deepEqual([out.usage_coverage, out.cost_ok], [false, false]);
});

test('hard failures count for both arms and name the matched answer path', () => {
  const out = evaluate([
    run('bug', 'baseline', 0, { hidden: true }, 1, { hard: { answer_access: false }, answer_access_matches: ['/repo/eval/v2/references/bug/correct.patch'] }),
    run('bug', 'cheffy', 0, { hidden: true }, 1, { hard: { answer_access: true, ledger_complete: true } }),
  ], config);
  assert.deepEqual(out.hard_failures, ['bug/baseline#0: answer_access (/repo/eval/v2/references/bug/correct.patch)']);
  assert.equal(out.accepted, false);
});

test('a run without judges gives no judge agreement and is not accepted', () => {
  const out = evaluate([
    run('bug', 'baseline', 0, { hidden: false }, 1, { judges: [] }),
    run('bug', 'cheffy', 0, { hidden: true }, 1, { judges: [] }),
  ], config);
  assert.deepEqual([out.judge_agreement, out.judge_ok, out.accepted], [null, false, false]);
});
