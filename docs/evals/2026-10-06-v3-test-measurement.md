# Eval v3 test measurement (2026-10-06)

> Resumen: la medición final del split de test de v3 da REJECTED. Cheffy no empeora en ninguna tarea, pero el split de test no tiene margen en el test oculto, y el costo supera el techo.

## Setup

- Results: `eval/results/v3-2026-10-06T10-07-21-363Z` (ignored by git).
- Split: test, frozen at 65704ef: climate-logger, file-vault, shop-catalog, webhook-retries, config-migration.
- Both arms, 5 repeats, 2 opus judges. Candidate model sonnet. Sandbox on for both arms.
- Cheffy at patches 1 to 6: compound trace commands, parallel turns, sast delta from base, project rules, same-class security fixes, light lane.

## Verdict

REJECTED.

| Check | Value | Rule | Result |
|---|---|---|---|
| Quality gain | 0.10 | above noise 0.20 | fail |
| Cost ratio | 4.47 | at most 2 | fail |
| Judge agreement | 0.93 | at least 0.9 | pass |
| Hard failures | none | none | pass |

## Per scenario (run score, baseline / Cheffy)

| Scenario | Baseline | Cheffy | Cost ratio |
|---|---|---|---|
| webhook-retries | 0.72 | 0.72 | 4.12 |
| config-migration | 0.76 | 0.84 | 3.82 |
| file-vault | 0.75 | 0.97 | 4.83 |
| shop-catalog | 0.80 | 0.83 | 5.12 |
| climate-logger | 0.57 | 0.73 | n/a |

## Per claim (25 runs each)

| Claim | Baseline | Cheffy |
|---|---|---|
| hidden | 19 | 20 |
| scope | 20 | 23 |
| redundancy | 14 | 17 |
| evidence | 19 | 20 |
| readability | 24 | 20 |
| security_report | 5/5 | 5/5 |

## Findings

- **No regression.** Cheffy scores at least the baseline on every scenario.
- **The gain comes from judge claims** (scope, redundancy), not from the hidden grader.
- **The test split has no hidden-test headroom.** The drop rule says that 0 of N in both arms marks a flawed task. climate-logger is 0/5 in both arms, so it is out. The other four scenarios are controls that both arms pass. A hidden-test gain was not possible on this split. The feasibility check should have run on this split after its pilot (3/3, 3/3, 0/3), before the final run.
- **climate-logger fairness doubt.** Its failing criterion joins a precision rule that explains the symptom (read the value from its digits) with an input-validation rule beyond the prompt (more than two decimals gets 400). Both arms fixed the averaging and missed it.
- **Readability regressed** (24 to 20). The judges cite internal terms in the reply: "Ledger: r-…", "light lane", "both tiers", "every role". SKILL.md asks for the ledger id in the evidence line. Check the train runs before a patch.
- **Noise metric.** `noise` is the largest half-range of the run scores of one scenario. It grows with the number of repeats. A different statistic must be chosen before the next run, not applied to this one.
- **Cost.** The binding cost check is v2 (3.6 times after patch 6). The v3 test tasks mostly touch trust boundaries, so Cheffy ran the full lane, as the user decided.

## Train context (same patches, 3 repeats, 1 judge)

Hidden: tenant-isolation 3/3 against 0/3, rate-limit-keys 3/3 against 2/3, invoice-rounding 2/3 against 2/3. Cheffy 8/9, baseline 4/9.
