import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapGain, evaluate, runScore } from '../eval/lib/score.mjs';

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

test('the bootstrap interval decides quality: a sure gain passes, a gain one lucky run makes fails', () => {
  const sure = bootstrapGain([{ baseline: [0.5, 0.5, 0.5], cheffy: [1, 1, 1] }]);
  assert.deepEqual([sure.low, sure.high], [0.5, 0.5]);
  // The baseline sometimes resamples to all 1s, so the low end of the interval is 0 and the gain does not count.
  const lucky = bootstrapGain([{ baseline: [1, 0, 1], cheffy: [1, 1, 1] }]);
  assert.equal(lucky.low, 0);
  assert.ok(lucky.high > 0);
});

test('the bootstrap is deterministic and skips scenarios without both arms', () => {
  const scores = [{ baseline: [0.2, 0.6, 0.4], cheffy: [0.8, 0.6, 1] }, { baseline: [], cheffy: [1] }];
  assert.deepEqual(bootstrapGain(scores), bootstrapGain(scores));
  assert.equal(bootstrapGain([{ baseline: [], cheffy: [1] }]), null);
});

test('the decision does not grow stricter with more repeats of the same results', () => {
  const runs = (n) => [0, 1].flatMap((arm) => Array.from({ length: n }, (_, i) => run('bug', arm ? 'cheffy' : 'baseline', i,
    arm ? { hidden: true, scope: i % 4 !== 0 } : { hidden: i % 2 === 0, scope: true }, 1)));
  const boot = { ...config, noise_statistic: { name: 'stratified-bootstrap', iterations: 10000, seed: 20261007, confidence: 0.9 } };
  const few = evaluate(runs(4), boot);
  const many = evaluate(runs(16), boot);
  // Same score mix with 4 times the repeats: the interval narrows, so a gain that passes with few repeats passes with many.
  assert.ok(many.gain_interval.high - many.gain_interval.low < few.gain_interval.high - few.gain_interval.low);
  assert.ok(!few.quality_ok || many.quality_ok);
});

test('a run without a recorded noise statistic keeps the half-range rule', () => {
  const results = [
    run('bug', 'baseline', 0, { hidden: true, scope: false }, 1),
    run('bug', 'baseline', 1, { hidden: true, scope: true }, 1),
    run('bug', 'cheffy', 0, { hidden: true, scope: true }, 1),
    run('bug', 'cheffy', 1, { hidden: true, scope: true }, 1),
  ];
  const old = evaluate(results, config);
  const boot = evaluate(results, { ...config, noise_statistic: { name: 'stratified-bootstrap' } });
  // Gain 0.25 equals the half-range 0.25, so the old rule fails; the bootstrap low end is 0, so it fails too.
  assert.deepEqual([old.gain_interval, old.quality_ok], [null, false]);
  assert.deepEqual([boot.gain_interval.low, boot.quality_ok], [0, false]);
});
