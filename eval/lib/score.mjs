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

export function evaluate(results, config) {
  const scenarios = [...new Set(results.map((r) => r.scenario))];
  const armRuns = (scenario, arm) => results.filter((r) => r.scenario === scenario && r.arm === arm);
  const perScenario = scenarios.map((scenario) => {
    const baseline = armRuns(scenario, 'baseline').map((r) => runScore(r.claims));
    const cheffy = armRuns(scenario, 'cheffy').map((r) => runScore(r.claims));
    return {
      scenario,
      baseline: mean(baseline),
      cheffy: mean(cheffy),
      noise: Math.max(spread(baseline), spread(cheffy)) / 2,
      cost_ratio: costPerAccepted(armRuns(scenario, 'cheffy')) / costPerAccepted(armRuns(scenario, 'baseline')),
    };
  });
  const qualityGain = mean(perScenario.map((s) => s.cheffy)) - mean(perScenario.map((s) => s.baseline));
  const noise = Math.max(0, ...perScenario.map((s) => s.noise));
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
  const qualityOk = qualityGain > noise;
  const costOk = usageCoverage && costRatio <= config.cost_ceiling;
  const judgeOk = agreement !== null && agreement >= config.min_judge_agreement;
  return {
    per_scenario: perScenario, quality_gain: qualityGain, noise, quality_ok: qualityOk,
    usage_coverage: usageCoverage, cost_ratio: costRatio, cost_ok: costOk,
    judge_agreement: agreement, judge_ok: judgeOk, hard_failures: hardFailures,
    accepted: qualityOk && costOk && judgeOk && hardFailures.length === 0,
  };
}
