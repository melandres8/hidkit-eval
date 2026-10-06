# Noise statistic for the phase 1 final run (pre-registration)

> Status: **approved by the user on 2026-10-06, with option (c).** It applies only to runs whose `meta.json` records it.

## Why a new statistic

The old rule compares the quality gain with the largest half-range of the run scores of one scenario. That half-range grows with the number of repeats: one unusual run in any scenario sets it. More measurement makes the check stricter, not more precise.

## Definition

- **Run score.** The run score is unchanged: the fraction of the applicable claims that pass.
- **Stratified bootstrap.** Each iteration does three things:
  1. In each scenario, it resamples with replacement the run scores of each arm.
  2. It takes the gain in that scenario as the Cheffy mean minus the baseline mean.
  3. It takes the mean of those gains over the scenarios.

  A scenario with runs in only one arm is left out.
- **Parameters.** 10,000 iterations. Seed 20261007, with the mulberry32 generator, so the same results always give the same interval.
- **Decision.** The quality check passes when the low end of the two-sided 90% interval is above 0 for both of these gains:
  - the run-score gain;
  - the hidden-test gain, where a run scores 1 when its hidden claim passes and 0 when it fails.

  A low end above 0 is the same as a one-sided 95% lower bound above 0.
- **Recording.** `eval/run.mjs` writes `noise_statistic` with these parameters into `meta.json`. `eval/report.mjs` uses the statistic that `meta.json` records. A run without the field keeps the half-range rule.
- **Minimum repeats.** The final run uses at least 5 repeats for each arm in each scenario.

## Limitations

- **Fixed scenarios.** The resampling stays inside each scenario. A pass supports the claim "Cheffy is better on these scenarios", not "Cheffy is better on hard tasks in general".
- **Small samples.** With 3 to 5 repeats, the percentile bootstrap gives intervals that are too narrow, so it is lenient. The rule of at least 5 repeats reduces this but does not remove it.

## Disclosure

This statistic was chosen **after** the 2026-10-06 test run (`v3-2026-10-06T10-07-21-363Z`) had been seen. It does not apply to that run, and the verdict of that run stays REJECTED.

For information only, here is what the new statistic gives on that run:

| Measure | Value |
|---|---|
| Run-score gain | 0.10 |
| 90% interval of the run-score gain | 0.05 to 0.16, so the check would pass |
| Largest half-range (old rule) | 0.20, so the check fails |
| Hidden-test passes, baseline against Cheffy | 19 against 20 of 25 |
| 90% interval of the hidden-only gain | 0.00 to 0.12, so the check would fail |

The run-score gain on that run came from the judge claims (scope and redundancy), not from the hidden tests.

## Decision of the user

A gain from the judge claims alone does not meet the goal "calidad superior". The user chose option (c) from three options:
- (a) the run-score interval alone;
- (b) the run-score interval, with no hidden-test regression;
- (c) the run-score interval and the hidden-only interval, both with a low end above 0.
