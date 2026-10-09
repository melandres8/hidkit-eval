export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const spread = (xs) => (xs.length ? Math.max(...xs) - Math.min(...xs) : 0);

export function runScore(claims) {
  const applicable = Object.values(claims).filter((v) => v !== null);
  return applicable.length ? applicable.filter((v) => v === true).length / applicable.length : 0;
}

export function costPerAccepted(runs) {
  const accepted = runs.filter((r) => r.accepted).length;
  return accepted ? runs.reduce((sum, r) => sum + r.cost_usd, 0) / accepted : Infinity;
}

export function judgeAgreement(pairs) {
  let same = 0;
  let total = 0;
  for (const [a, b] of pairs) {
    // A run graded with --no-judge has no pair; it gives no evidence of agreement.
    if (!a || !b) continue;
    for (const key of Object.keys(a)) {
      if (a[key] === null && b[key] === null) continue;
      total += 1;
      if (a[key] === b[key]) same += 1;
    }
  }
  return total ? same / total : null;
}

// Deterministic PRNG (mulberry32), so a report gives the same interval on every read of the same results.
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))];

// Pre-registered noise statistic (docs/evals/2026-10-06-noise-statistic.md): a bootstrap stratified by scenario.
// Each iteration resamples the run scores of each arm in each scenario with replacement, then takes the gain as the
// mean over scenarios of (Cheffy mean - baseline mean). The gain is above noise when the lower bound of the
// two-sided interval is above 0. Scenarios with only one arm give no gain and are left out.
// The user chose option (c): the run-score gain and the hidden-test gain must both be above noise.
export function bootstrapGain(scores, { iterations = 10000, seed = 20261007, confidence = 0.9 } = {}) {
  const strata = scores.filter((s) => s.baseline.length && s.cheffy.length);
  if (!strata.length) return null;
  const random = prng(seed);
  const resampledMean = (xs) => {
    let sum = 0;
    for (let i = 0; i < xs.length; i += 1) sum += xs[Math.floor(random() * xs.length)];
    return sum / xs.length;
  };
  const gains = [];
  for (let i = 0; i < iterations; i += 1) {
    gains.push(mean(strata.map((s) => resampledMean(s.cheffy) - resampledMean(s.baseline))));
  }
  gains.sort((a, b) => a - b);
  const tail = (1 - confidence) / 2;
  return { low: quantile(gains, tail), high: quantile(gains, 1 - tail), confidence, iterations, seed };
}

export function evaluate(results, config) {
  const scenarios = [...new Set(results.map((r) => r.scenario))];
  const armRuns = (scenario, arm) => results.filter((r) => r.scenario === scenario && r.arm === arm);
  const scores = scenarios.map((scenario) => ({
    baseline: armRuns(scenario, 'baseline').map((r) => runScore(r.claims)),
    cheffy: armRuns(scenario, 'cheffy').map((r) => runScore(r.claims)),
  }));
  const perScenario = scenarios.map((scenario, i) => {
    const { baseline, cheffy } = scores[i];
    return {
      scenario,
      baseline: mean(baseline),
      cheffy: mean(cheffy),
      noise: Math.max(spread(baseline), spread(cheffy)) / 2,
      cost_ratio: costPerAccepted(armRuns(scenario, 'cheffy')) / costPerAccepted(armRuns(scenario, 'baseline')),
    };
  });
  const qualityGain = mean(perScenario.map((s) => s.cheffy)) - mean(perScenario.map((s) => s.baseline));
  // `noise` (the largest half-range) is kept for reference only. It grows with the number of repeats, so it does not decide.
  const noise = Math.max(0, ...perScenario.map((s) => s.noise));
  // A run decides with the statistic that its meta.json records. Older runs record none and keep the half-range rule.
  const bootstrap = config.noise_statistic?.name === 'stratified-bootstrap';
  const gainInterval = bootstrap ? bootstrapGain(scores, config.noise_statistic) : null;
  const hiddenScores = scenarios.map((scenario) => Object.fromEntries(['baseline', 'cheffy'].map((arm) => [arm, armRuns(scenario, arm).map((r) => (r.claims.hidden === true ? 1 : 0))])));
  const hiddenInterval = bootstrap ? bootstrapGain(hiddenScores, config.noise_statistic) : null;
  const usageCoverage = results.every((r) => typeof r.cost_usd === 'number');
  const costRatio = usageCoverage
    ? costPerAccepted(results.filter((r) => r.arm === 'cheffy')) / costPerAccepted(results.filter((r) => r.arm === 'baseline'))
    : null;
  // Both arms: a baseline run that read the answers spoils the comparison as much as a Cheffy run.
  const hardFailures = results.flatMap((r) => Object.entries(r.hard).filter(([, ok]) => ok === false).map(([name]) => {
    const detail = name === 'answer_access' && r.answer_access_matches?.length ? ` (${r.answer_access_matches.join(', ')})` : '';
    return `${r.scenario}/${r.arm}#${r.repeat}: ${name}${detail}`;
  }));
  const agreement = judgeAgreement(results.map((r) => r.judges));
  const qualityOk = bootstrap
    ? gainInterval !== null && gainInterval.low > 0 && hiddenInterval !== null && hiddenInterval.low > 0
    : qualityGain > noise;
  const costOk = usageCoverage && costRatio <= config.cost_ceiling;
  const judgeOk = agreement !== null && agreement >= config.min_judge_agreement;
  return {
    per_scenario: perScenario, quality_gain: qualityGain, gain_interval: gainInterval, hidden_interval: hiddenInterval, noise, quality_ok: qualityOk,
    usage_coverage: usageCoverage, cost_ratio: costRatio, cost_ok: costOk,
    judge_agreement: agreement, judge_ok: judgeOk, hard_failures: hardFailures,
    accepted: qualityOk && costOk && judgeOk && hardFailures.length === 0,
  };
}
