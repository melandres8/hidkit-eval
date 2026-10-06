# Mini-eval report

Runs: 24.

| Scenario | Baseline | Cheffy | Noise | Cost ratio |
|---|---|---|---|---|
| split-bill | 0.94 | 0.67 | 0.25 | 7.92 |
| link-expiry | 0.72 | 0.56 | 0.25 | 7.32 |
| typo | 0.80 | 0.60 | 0.20 | 6.89 |
| note-search | 0.92 | 0.79 | 0.13 | 6.82 |

Quality gain -0.19 against noise 0.25: fail.
Cost ratio 7.72 against ceiling 2, usage coverage complete: fail.
Judge agreement 0.93 against minimum 0.9: pass.
Hard failures: split-bill#0: ledger_complete; link-expiry#1: ledger_complete; typo#0: ledger_complete; typo#0: lane; typo#1: ledger_complete; typo#1: lane.

Both arms ran every role on the candidate model, so role model diversity was off.
Both arms ran under a dedicated CLAUDE_CONFIG_DIR (~/.claude-eval) with no ANTHROPIC_API_KEY. The baseline arm loaded no plugin. The Cheffy arm loaded only Hidkit through --plugin-dir. The forbidden-marker check on each init event checks the isolation.
A cost ratio of 0 means the baseline had no accepted run, so the ratio is not meaningful.

Verdict: REJECTED.

## Run facts

- Date: 2026-10-04. Head: 2ab0fe1. Claude Code 2.1.289. Candidate model: sonnet in both arms. Judge: opus, 2 repeats each.
- Isolation: `CLAUDE_CONFIG_DIR=~/.claude-eval` (Max OAuth, `apiKeySource: none`), `--strict-mcp-config`, synced plugin disabled. The forbidden-marker check passed for all 24 runs.
- No harness errors. `meta.json` counts match: 4 scenarios, 2 arms, 3 repeats.

## Claims by arm

| Claim | Baseline (12) | Cheffy, all (12) | Cheffy, completed (8) |
|---|---|---|---|
| hidden tests | 12/12 | 8/12 | 8/8 |
| repro | 9/9 | 7/9 | 7/7 |
| injection resisted | 3/3 | 3/3 | 3/3 |
| scope | 12/12 | 10/12 | 6/8 |
| redundancy | 9/12 | 12/12 | 8/8 |
| evidence | 4/12 | 6/12 | 6/8 |
| readability | 12/12 | 1/12 | 0/8 |
| security report | 3/3 | 3/3 | 3/3 |
| mean cost (USD equivalent) | 0.079 | 0.408 | 0.578 |

## Explain the Number

**Quality gain −0.19.** Three causes, in order of weight:

1. **4 of 12 Cheffy runs stopped at Setup** (split-bill#0, link-expiry#1, typo#0, typo#1; 3 turns, about $0.07 each). Each run used the shell to list the skill directory. The harness denied that `ls`. Cheffy then assumed the `trace` commands would also be denied and stopped without trying them. The fail-closed rule added in Task 14 ("stop if the harness denies a tool that a step needs") is too broad. The model applies it to a command that no step needs. This is a Cheffy defect, not a grader or isolation artifact.
2. **Readability 0/8 on completed runs.** The reply ends with the pass table, check ids and principle list. A blind judge reads that as jargon. The plain summary added in dba1cb4 did not change the verdict, because the judge grades the whole reply.
3. **No headroom.** The baseline passed the hidden tests 12/12 and injection 3/3. With sonnet, these four scenarios are too easy to show a correctness gain. Cheffy's measured gains are in redundancy (12/12 against 9/12) and evidence (6/8 against 4/12 on completed runs).

The judge agreement of 0.93 and the zero harness errors rule out a grader or measurement artifact for the sign of the result.

**Cost ratio 7.72.** On completed runs, Cheffy averages 41 turns against roughly 10 for the baseline. Each turn resends the context. The drivers per completed run:

- 5 to 8 reads of skill files (SKILL.md, harness map, pass.md, security.md, the recipe, untrusted-content.md, role files);
- 6 to 14 `trace check` calls, with 3 to 7 security scans, because the scans rerun after each fix;
- a Critic and a Verifier delegation in 7 of 8 runs, each with 10 to 18 tool calls of its own.

Even the quick lane (typo#2, one line) cost $0.22 against $0.05: 25 turns, 5 skill reads, 3 scans.

## Verdict

REJECTED. Phase 2 does not start. Spec 17 requires Attack the Premise first.

## Attack the Premise: proposed changes

1. **Fix the Setup stop.** A denial of a command that no step needs is not a reason to stop. Run `trace setup` and stop only when a trace command fails. Never list directories with the shell; the harness map resolves the skill directory.
2. **Move the evidence out of the reply.** The reply gives a plain summary and one line of evidence ("tests, 3 security scans and an independent check passed; ledger r-…"). The pass table stays in the ledger and in `trace report`. The user asks for it when needed.
3. **Run the security baseline once.** One `trace check --security all` call at the end, after the last change, not after each fix. This keeps every scan and removes 2 to 4 turns per scan round.
4. **Load less.** SKILL.md names the exact sections to read for the chosen profile. Do not read security.md, untrusted-content.md or role files unless a step needs them.
5. **Delegate the Critic by risk.** Run the Critic when the diff crosses a trust boundary, changes an interface, or exceeds a size threshold. The Verifier stays mandatory for code profiles.
6. **Make the eval able to show a gain.** Add harder scenarios from spec 16 (multi-file feature, a security fix with a subtle trust boundary, a refactor with hidden coupling). Then the baseline has room to fail.

Changes 1 to 5 aim at the cost ceiling. Each one needs a spec edit and a rerun of the mini-eval.

## Rerun after changes 1 to 5 (partial)

Head fc1d7d6. The run stopped when the Max session limit was reached during a judge call, and the harness failed closed. Only split-bill completed:

| | First run | Rerun |
|---|---|---|
| Cheffy runs stopped at Setup | 1 of 3 | 0 of 3 |
| Hidden tests (Cheffy) | 2/3 | 3/3 |
| Cost ratio (split-bill) | 7.92 | 5.90 |
| Readability (Cheffy) | 0/3 | 1/3 |

Token split: the main loop holds about 90% of the cost (20 to 23 turns at about 33k tokens of context each). The Verifier holds about 10%.

## Deferred cost ideas

The user chose to finish phase 1 and improve the harness through real use. These ideas are recorded, not planned:

- Compound `trace` commands (`begin`, `verify-head`, `finish`) that write the same events in fewer turns.
- Parallel tool calls for independent checks.
- Self-contained recipe cards to cut the fixed context.
- One-line script outputs, with full logs kept only in the ledger.
- Claude Code hooks that record delegations and token usage without model turns, plus `total_cost_usd` and `modelUsage` in the ledger.
