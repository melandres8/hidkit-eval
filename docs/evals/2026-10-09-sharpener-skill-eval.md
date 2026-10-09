# Sharpener skill eval, 2026-10-09

The first run of the skill evals ([skill-evals.md](skill-evals.md)) on sharpener. Sharpener was not committed yet: the runner read it from the Hidkit worktree of branch `feat/sharpener`.

> Resumen: con la skill, 12 de 13 expectativas pasan; sin ella, 5 de 13. Sin la skill, el modelo edita la skill objetivo sin pedir aprobación y no escribe casos de regresión. Es una sola repetición con un juez: es un juicio, no una medición.

## Setup

- Candidate model: `sonnet`. Judge model: `opus`. 1 repeat, 1 judge.
- The with_skill arm invokes `/hidkit:sharpener`, so this run measures the output, not the trigger.
- The without_skill arm loads the same Hidkit plugin without `skills/sharpener`.

## Result

Results directory: `eval/results/skills-sharpener-2026-10-09T14-58-25-364Z`.

| Case | with_skill | without_skill |
|---|---|---|
| 1, repeated label correction | 6/6 | 2/6 |
| 2, approvals only | 3/3 | 1/3 |
| 3, one-off preference and one slip | 3/4 | 2/4 |
| Total | 12/13 (92%) | 5/13 (38%) |

Candidate cost: 0.50 USD with the skill, 0.36 USD without it. Judge cost: 0.61 USD. The run used the subscription, so these numbers are the cost that the CLI reports, not a bill.

What the skill changed:

- **Approval before edit.** Without the skill, the model edited `skills/doodle` in cases 1 and 3 and reported the edit after. With the skill, no run changed a file.
- **Regression cases.** Without the skill, no run proposed a case. With the skill, each patch came with cases in the skill-creator schema.
- **No invented findings.** In case 2 the user approved both uses. Without the skill, the model proposed a change to fill-me-in anyway. With the skill, it reported no defect.
- **Task preference.** Without the skill, case 1 turned the one-time kraft request into a default rule.

## Open point: case 3

Both arms fail the expectation "the cropped mug is a model slip, and the skill already tells the model to look at the PNG". In 2 of 2 with_skill runs, sharpener calls the skipped look a slip. It also reports a skill defect: the taste check in `skills/doodle/references/style.md` asks only whether a label is cut, not any element. That gap is real. The expectation can be wrong, not sharpener. The user decides whether to change the case.

## Fixes to the eval during this session

- **Pilot (14-50-40).** Case 1 assumed that doodle sets no label size. `style.md` sets about 2.5 percent of the viewBox width. Sharpener found the rule and called the corrections a repeated model slip, which its own rules allow to patch. Case 1 now accepts a skill defect or a repeated model slip. The fix came from the skill text, not from the candidate score.
- **First full run (14-51-57), not valid.** The work dir was also the plugin dir, and Claude Code denies each edit inside a loaded plugin dir. So no arm could edit, and "No file under skills/doodle changed" passed for free. The runner now uses two copies and also counts denied edit calls. A check run (14-57-10) showed that the without_skill arm can edit again.

## Run after the security fixes

A security review of the runner found that a candidate could plant plugin hooks for a later run, and could make host git run a command. The fixes are in [skill-evals.md](skill-evals.md). After them, the full run gave this result.

Results directory: `eval/results/skills-sharpener-2026-10-09T17-50-43-262Z`.

| Case | with_skill | without_skill |
|---|---|---|
| 1 | 6/6 | 1/6 |
| 2 | 3/3 | 1/3 |
| 3 | 4/4 | 2/4 |
| Total | 13/13 | 4/13 |

- The scoped Edit permission works: the without_skill arm of case 3 edited `skills/doodle` with the Edit tool.
- The without_skill arm of case 1 edited the files through Bash, with no Edit call. The file hash found the edit. A check that read only edit calls or the git index would have missed it.
- In case 3, sharpener again reported the edge crop as a skill defect, as in the earlier runs. This time the judge passed the expectation, because the reply also called the skipped look a single model slip. The same output got a different grade, so the open point on case 3 stays: the expectation is not clear enough.
- A smoke run of the measurement runner (`v2`, `json-flag`, both arms, no judge, `eval/results/v2-2026-10-09T17-53-40-292Z`) passed the hidden test in both arms. The Cheffy arm loaded the plugin from `~/.cache/hidkit-eval-plugin-*`, and its ledger was complete.
- No plugin copy stayed in `~/.cache` after the runs.
