# hidkit-eval

The measurement eval of [Hidkit](https://github.com/melandres8/hidkit). It runs the same tasks with plain Claude Code (the baseline arm) and with Cheffy (the Cheffy arm), then compares quality and cost.

Keep this repository private. The hidden tests and the reference patches must not reach a model training set. If they do, the scenarios cannot measure anything.

> **Warning: deliberate vulnerabilities.** The fixtures under `eval/*/fixtures/` contain security defects on purpose, such as cross-tenant reads and injection paths. They are test material. Never copy, reuse, or deploy fixture code.

## What it measures

- **Hidden tests:** a grader that the candidate never sees checks the behavior.
- **Judge claims:** two blind Opus judges grade scope, redundancy, evidence, readability, and the security report.
- **Cost:** the cost ratio of the Cheffy arm to the baseline arm.
- **Noise:** repeats of each scenario. A gain counts only when it is larger than the noise.

The method follows [Automating eval design and hillclimbing](https://claude.dev/blog/automating-eval-design-and-hillclimbing/): headroom pilots, a train and test split, one patch for each round, and a frozen test split.

## Layout

| Path | Content |
|---|---|
| `eval/run.mjs` | The runner. |
| `eval/report.mjs` | The report and the verdict of one results directory. |
| `eval/lib/` | Harness, grader, score, and validation code. |
| `eval/v2/` | The easy set: the no-regression and cost gate. |
| `eval/v3/` | The hard set: the quality gate, with a train and a test split. A retired scenario stays for the record; only `--split retired` runs it. |
| `eval/fixtures/`, `eval/graders/`, `eval/scenarios.json` | The first set (v1). |
| `eval/skills/` | The skill evals: the cases of each Hidkit skill and their runner. See [docs/evals/skill-evals.md](docs/evals/skill-evals.md). |
| `docs/evals/` | The scenario catalogs and the measurement reports. |
| `docs/specs/cheffy-design.md` | The design of Cheffy and the reason for each decision. |
| `eval/results/` | Run output. Git ignores it. |

## Requirements

- Node.js 20 or later. The v3 validator needs Node.js 22.1 or later.
- A Hidkit checkout. By default the runner uses `../hidkit`. Set `HIDKIT_DIR` to use another path.
- The `claude` CLI, logged in with a subscription in the config directory `~/.claude-eval`. The runner removes `ANTHROPIC_API_KEY`, so a run never bills the API.
- `semgrep`, `osv-scanner`, and `gitleaks` on `PATH`, for the security gate of the Cheffy arm.

## Usage

Every run spends subscription tokens. Estimate the cost before you start one.

```bash
npm test
```

```bash
npm run validate
```

```bash
node eval/run.mjs --set v3 --split train --repeats 3
```

```bash
node eval/report.mjs eval/results/<run-dir>
```

Other options: `--arms baseline,cheffy`, `--scenario <id>`, `--no-judge`, `--judge-only <dir>`, `--judge-repeats <n>`.

## Rules for a final run

1. Run the zero-token feasibility check on the exact split first. A scenario that both arms fail on every repeat is flawed. A scenario that both arms always pass has no headroom.
2. Fix the noise statistic before the run, not after it.
3. Use two judges. One judge gives no agreement value, and the verdict cannot be ACCEPTED.
