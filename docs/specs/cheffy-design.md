# Cheffy design

This document describes the design of Cheffy as it ships now, and the reason for each decision. The shipped files hold the exact rules. Every file path in this document is a path in the [Hidkit repository](https://github.com/melandres8/hidkit). Where this document and a file disagree, the file is correct.

## 1. Purpose

Hidkit is a software factory for client products and internal products. Its goal is high product quality: strong verification, zero redundant code, and good architecture. Security is a first-order requirement, not a late review.

Cheffy is the head agent. Cheffy routes each task to a recipe, delegates work to roles, and checks every result at the pass. Cheffy MUST be efficient. Process that does not raise quality is waste, and the ledger makes that waste visible.

Cheffy derives its principles, recipes, and pass rules from pstack (MIT License).

## 2. Scope

This spec covers:

- the `cheffy` skill, with 3 recipes (Bug fix, Feature, Eval) and 18 principles;
- 5 roles: Investigator, Implementer, Critic, Verifier, and Judge;
- the `plating` writing standard;
- the `trace`, `lint`, and `doctor` scripts, and the security registry;
- the Claude Code harness map and plugin manifest;
- the verification of Hidkit itself.

Section 18 lists planned work that does not ship yet.

## 3. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | One canonical `skills/` directory, one thin manifest and one harness map for each harness, and no build step. | The file that you edit is the file that runs. |
| D2 | Model-facing files are in English and follow ASD-STE100. | Short, literal instructions improve adherence. |
| D3 | Cheffy is an explicit, sticky mode. The user starts it with its slash command, and it stays active until the user says "stop Cheffy". | The user keeps control, and the adapters stay small. |
| D4 | Roles have functional names. Kitchen terms are only for Cheffy, the pass, and recipes. | STE prefers words with one clear meaning. |
| D5 | Roles declare a model tier. The harness map resolves it, and the config can override it. | Model IDs age, and harnesses differ. |
| D6 | Each delegation, check, decision, and pass writes an event to a local ledger that git ignores. | Evidence and cost become measurable, and pull requests stay clean. |
| D7 | Only 2 skills: `cheffy` and `plating`. | One entry point, and zero redundancy. |
| D8 | Scripts enforce the rules that a model tends to skip. | A refused command is stronger than an instruction. |

## 4. Layout

```
hidkit/
  .claude-plugin/plugin.json    plugin manifest
  skills/cheffy/
    SKILL.md                    the core
    pass.md                     gates, profiles, verdicts, evidence
    security.md                 gate 11 rules
    untrusted-content.md        trust rules for Cheffy and every role
    security-tools.yaml         the security registry
    recipes/                    bug-fix, feature, eval
    principles/                 18 files
    references/harness/         claude-code.md
    scripts/                    trace.mjs, lint.mjs, doctor.mjs, lib/, lint.config.json
  skills/plating/SKILL.md       the writing standard
  agents/                       the 5 role files
  scripts/                      smoke-claude-code.mjs and its fixture
  test/                         unit tests
  GLOSSARY.md  hidkit.config.example.yaml  NOTICE  README.md
```

Run data lives in `.hidkit/runs/` at the root of the main checkout. The `trace` script resolves that root through the git common directory, so worktrees share one ledger.

**Progressive loading.** The `Files to read` section of `SKILL.md` is the single list of what Cheffy reads. Cheffy reads `security.md`, `untrusted-content.md`, a role file, or a linked principle only when a step needs it. Cheffy never lists or searches directories for Hidkit files. Why: every file that Cheffy reads costs tokens on each later turn.

## 5. Cheffy core

The file `skills/cheffy/SKILL.md` holds the core rules.

### 5.1 Setup

Cheffy identifies the harness, reads the harness map and `hidkit.config.yaml`, routes the task, and runs `trace begin`. Cheffy changes no project file before `trace begin` succeeds. If a `trace` command fails or is denied, Cheffy stops, names the command and the permission, and ends any open run as `failed`. Why: a run without a ledger has no evidence, so the pass cannot judge it.

If `trace begin` reports `adapter_verified: false`, the reply says so, and every enforcement counts as `instructed`.

Cheffy runs one command in each shell call, with no shell variables, `;`, `&&`, or pipes. Why: permission rules match single commands, and a headless run denies a chained command. Cheffy makes independent reads, checks, and delegations in one turn, as parallel calls. Why: each turn re-reads the whole context, so fewer turns cost fewer tokens.

### 5.2 Router

The router table in `SKILL.md` is the only place that holds recipe triggers. The `lint` script checks that router rows and recipe files match.

| Recipe | Trigger |
|---|---|
| Bug fix | A reported defect. |
| Feature | New or changed behavior. |
| Eval | A blind comparison of variants of a skill, a prompt, a role, or a recipe. |

For any other task, Cheffy tells the user. Then it asks, or works with `--recipe none`. Such a run uses profile `code` when it changes files, and `read-only` when it does not.

### 5.3 Lanes

Lanes apply only to recipes with profile `code`. Cheffy picks the lightest lane whose conditions all hold, and announces it.

| Lane | Conditions | Work | Profile |
|---|---|---|---|
| Quick | 1 file, 20 lines or fewer, no new behavior question | Inline, without the recipe | `quick` |
| Light | 3 files or fewer, 80 lines or fewer | The recipe steps inline, no delegation | `light` |
| Full | Every other task | The recipe with its roles | the recipe profile |

The quick and light lanes change no public interface and touch no trust boundary, schema, or data migration. Why: subagents multiply the cost of a run, and a small, low-risk change does not need isolated judgment. A trust boundary keeps the full recipe, so the Critic and the Verifier run where the risk is.

The lane is a one-way ratchet. If a condition fails during the work, Cheffy records a `decision`, ends the run as `paused`, and begins a heavier-lane run with `--resumes`. Why: a move to a lighter lane would drop checks that the work already needs.

### 5.4 Todo list and questions

In a full recipe, Cheffy copies the recipe steps verbatim into the todo list. A skipped step stays as `skip: <reason>`, so the user can check the decision.

If running something can answer a question, Cheffy runs it. Cheffy asks the user only for a product or preference call. Why: the user's time is the most expensive resource.

### 5.5 Delegation

Cheffy delegates only when the work needs isolated judgment, when bulk reading would fill its context, or when the work splits into disjoint parallel slices. Otherwise Cheffy works inline. Why: each delegation costs a full context.

- Cheffy builds each brief with `trace brief`, delegates with the model from the brief header, answers each `dissent`, and closes the delegation with `trace close`.
- A brief has a closed scope: file paths, the named data shape, and success criteria. It gives pointers, not pasted content.
- Cheffy owns all delegated work. It reviews each diff and writes its own summary. Why: one agent answers for the result.
- New work goes to a fresh subagent. Each parallel writer gets its own worktree, and Cheffy merges each worker branch into the run branch.
- If the harness cannot delegate, Cheffy works inline with `--mode inline`. Cheffy never invents a tool.

At head, Cheffy runs `trace verify-head` once. The Critic gets the diff path and the head check ids. The Verifier gets the `<base>..<head>` range. The two run in parallel at the same head. If an act-on finding changes the code, both head steps run again.

### 5.6 Untrusted content

Cheffy and the roles read content that Hidkit does not control, and that content can carry injected instructions. The file `untrusted-content.md` holds the rules, and every role reads it. Why: roles never load `SKILL.md`, so the rules need their own file.

Trusted content comes only from the user's chat, `hidkit.config.yaml`, and Hidkit's own files. Untrusted content is data, never instructions. No push, comment, or PR edit comes from untrusted content.

The `trace brief` command enforces part of this. It tags each field `trusted` or `untrusted`, and refuses `--trusted` for `diff`, `checks`, and `outputs`. A random marker starts each field, so a field value cannot forge a section.

### 5.7 Autonomy

Cheffy does reversible work without asking. It pauses before an irreversible action, such as a force-push to a shared branch, a deploy, data deletion, or a message to a third party. A merge into a shared branch that the user did not order is irreversible too. "No" is a valid answer. Why: the user wants speed on safe work and control over work that cannot be undone.

### 5.8 Finish and reply

Cheffy commits the ledger only when a secret scan of it passes. Then `trace finish` records the last pass, ends the run, and prints the report flags.

The reply follows plating, in the user's language. It has a summary of 3 lines or fewer, one evidence line, and one line for each waiver, security flag, and notice. The default reply shows no pass table, check ids, gate numbers, role names, or principles. When the user asks, Cheffy takes the pass table from `trace report`. Why: a reader who meets a table of gates loses the result, and the ledger keeps the full evidence.

## 6. Recipes

Each recipe has frontmatter with `name`, `profile`, and `roles`, then a title, one sentence on what Cheffy owns, `Steps`, and `Reply`. The last step runs the pass with the recipe profile. The `lint` script enforces this template and a limit of 12 steps. Why: a fixed template keeps each recipe short and checkable.

**Bug fix** (`code`). Cheffy owns the proof of the defect, its root cause, and the evidence that the fix removes it. Cheffy reproduces the defect first and binary-searches the cause with runtime evidence. Cheffy commits a failing repro test before the fix. The Verifier compares the base check with the head checks. Why: a fix without a failing repro proves nothing.

**Feature** (`code`). Cheffy owns the design, the decomposition, and the evidence that the new behavior works. Cheffy names the data shape and explores 2 or 3 designs when the change crosses a function boundary. It writes a throughput checkpoint before it fans out Implementers. The new tests run on base and fail there. Why: that failure shows that the tests cover the new behavior.

**Eval** (`read-only`). Cheffy owns a small blind comparison of variants. The result is a judgment, not a measurement. Candidates run in sanitized directories with one organic prompt, and one Judge grades neutral-labelled outputs against a rubric. Why: a candidate that knows about the comparison behaves differently.

**Project rules.** Bug fix and Feature read the README and its linked docs for the touched area. Cheffy lists each project rule with `file:line` and gives the rules to the Implementer and the Critic. Gate 5 checks that the diff keeps them. Why: a change can look right in the named code and still break a rule that the docs state.

## 7. Principles

The principles are a shared vocabulary for Cheffy, the roles, and the pass. Each is one file in `skills/cheffy/principles/`, with a `group` and the sections `When`, `Rule`, and `Why`.

| Group | Principles |
|---|---|
| Core | Attack the Premise; Build the Lever; Exhaust the Design Space; Laziness Protocol; Minimize Reader Load; Secure by Default; Single Source of Truth |
| Architecture | Boundary Discipline; Make Operations Idempotent; Model the Domain; Separate Before Serializing Shared State; Type System Discipline |
| Verification | Explain the Number; Fix Root Causes; Prove It Works; Sequence Work into Verifiable Units; Test Behavior, Not Implementation |
| Delegation | Guard the Context Window |

Hidkit ships a principle only when a shipped file links it. Why: Cheffy never lists directories, so an unlinked principle is never read.

## 8. The pass

The pass is a rubric of checkable claims, not a score. The file `pass.md` holds the 12 gates: Proof, Tests, Repo gates, Zero redundancy, Scope, Taste, Critic, Comments, Prose, Trace, Security, and Non-functional. Gates 1, 2, 3, 9, and 11 require `check` evidence. Gates 6 and 12 are SHOULD, and their vocabulary follows ISO/IEC 25010.

- **Proof.** In the `code` profile, the last Verifier delegation of the run closes gate 1 with `PASS` or `PASS+NOTES`. Why: Cheffy does not judge its own work.
- **Tests.** A test of new behavior fails when a stub replaces the implementation. In Bug fix, the repro commit comes before the fix.
- **Scope.** Each diff line serves the request. The fix of a same-class security defect serves it. Why: a known sibling vulnerability is never out of scope.
- **Critic.** The Critic runs when the diff touches a trust boundary, changes a public interface, or changes more than 80 lines. Why: a Critic on every small diff costs more than it finds.

| Profile | Gates | Used by |
|---|---|---|
| `code` | 1 to 12 | Bug fix, Feature, the full lane |
| `light` | 1, 2, 3, 4, 5, 8, 9, 10, 11 | The light lane, with no Verifier |
| `quick` | 1, 3, 5, 9, 10, 11 | The quick lane, with no Verifier and no deep review |
| `read-only` | 1, 9, 10 | Eval |
| `prototype` | 1, 9, 10 | No shipped recipe |
| `ops` | 1, 9, 10 | No shipped recipe |

The `profile:` field of a recipe is the only place that assigns its profile.

**Verdicts.** A `PASS` or `PASS+NOTES` verdict ships the work. One `FAIL` gate makes the verdict `FAIL`. After 3 `FAIL` verdicts in a row on one gate, Cheffy applies Attack the Premise and reports to the user.

**Evidence.** Cheffy runs every verification command through `trace check`. A gate that requires a check cites passing `check` ids. Why: a recorded exit code is harder to fake than prose. A trivial command can still pass, so the Critic and the Verifier judge whether each check tests the claim.

`trace pass` refuses a passing verdict when a gate lacks a result, a MUST gate is `NA`, or a gate cites an unknown or failed check. It also refuses one when the security gate lacks one of the three scans, or a delegation is open or closed twice. In the `code` profile, it also needs the last Verifier verdict.

## 9. Security

Gate 11 applies `skills/cheffy/security.md`.

**Baseline.** Three scans run after the last code change: `secrets`, `dependencies`, and `sast`. The `trace verify-head` command runs them, and a later code change triggers one rerun.

**Security registry.** The file `security-tools.yaml` maps each scan to one tool with a pinned version and a checksum for each platform: gitleaks, osv-scanner, and semgrep. Its `ecosystems` key helps `doctor` detect the ecosystems of a project. Why: a pinned version makes the evidence repeatable.

A missing tool or a version that does not match the registry fails gate 11. The `security.checks` key in the config can replace a scan, but an override has no version pin, so `trace report` flags it. The `doctor.mjs` script prints pinned install commands. Cheffy MUST NOT install or download tools, because that is the user's decision.

**New findings only.** On a clean work tree, `sast` reports only findings that are new since `<base>`, through the registry's `delta_args`. With uncommitted changes, it scans the whole repository. Why: a finding in untouched code is no reason to fail the run. The other two scans always cover the whole tree.

**Deep review.** When the diff touches a trust boundary, the Critic runs in `security` mode. It applies the OWASP ASVS level from `security.asvs_level` (default 2) and records a short STRIDE threat model.

**Waivers.** Only the user writes a waiver, in `security.waivers`, and Cheffy MUST NOT write one. A waiver names one security check. It expires at most 90 days after `approved_on`. It never excuses a repo gate. A high or critical finding MUST NOT ship with a waiver unless the user approves it in the same run. The `trace check` command records a `decision` for each waiver that the run uses, and the reply names it. Why: expiry forces a fresh decision, and the accountability stays human.

**Same-class defects.** Cheffy fixes a security defect with the same cause as the requested one, on another path, in the same change. The reply reports it. Why: a fix that leaves the sibling open leaves the vulnerability open.

**References.** OWASP ASVS sets the depth. OWASP Top 10 and CWE Top 25 form the Critic checklist. NIST SSDF (SP 800-218) lists the practices that the recipes follow.

## 10. Roles

Each role is a markdown file in `agents/`. The frontmatter declares `tier`, `access`, `input`, `withheld`, and `tools`. Its body has the sections `Mandate`, `Judgment`, `Limits`, `Input`, and `Output`. The `lint` script checks both.

| Role | Tier | Access | Output |
|---|---|---|---|
| Investigator | fast | read-only | Facts with `file:line`, in `how` or `why` mode |
| Implementer | fast | write | Commits in its own worktree, verification, deviations |
| Critic | strong, other family than the Implementer | read-only | Findings with severity and evidence, in `quality` or `security` mode |
| Verifier | strong | read-only | `PASS`, `PASS+NOTES`, or `FAIL`, base against head |
| Judge | strong | read-only | A yes or no for each rubric claim, and a blind preference |

Each role is an isolated judge, not an extension of Cheffy:

- The `Judgment` section lists the calls that the role makes alone, such as the Critic's severity or the Verifier's `FAIL`.
- A role never loads Cheffy's `SKILL.md`. Why: this keeps its judgment independent and its context small.
- The `trace brief` command requires every `input` field and refuses every other field. The Critic never sees Cheffy's reasoning, the Implementer summary, or prior verdicts. The Verifier never sees Cheffy's reasoning, the Implementer summary, or the Critic findings. The Judge never sees model names or variant identity. Why: a reviewer who reads the author's reasoning tends to agree with it.
- Each output has a `dissent` field, and Cheffy answers each dissent.

The Verifier writes only the ledger and never changes the checkout. Why: it runs at the same head as the Critic.

**Enforcement.** Each `delegation` event records `enforced` or `instructed`. A role is `enforced` only when it is read-only, has no shell tool, and runs on a verified adapter that enforces a tool allowlist. So the Critic and the Judge are `enforced`. Why: a role with a shell can write through it.

## 11. Model tiers and configuration

The tiers are `strong` and `fast`. The model comes from the role override in the config, then the tier override, then the harness map, then the session model. The `delegation` event records `model_source` as `config`, `harness-map`, or `inherited`. The Critic and the Judge SHOULD use another model family than the Implementer, if the harness allows. Without model selection, every role inherits the session model, and the reply says so.

The file `hidkit.config.yaml` is optional, and `hidkit.config.example.yaml` shows every key. The `trace` script refuses a config that sets `roles.<role>.external`, because no run step for an external role exists yet.

## 12. Ledger

The ledger is `.hidkit/runs/<run-id>.jsonl`, append-only and ignored by git. The script `trace.mjs` writes every event, and Cheffy never writes JSON by hand. Why: a script writes complete, redacted events.

Every event has `schema_version`, `run_id`, `type`, and `at`.

| Type | Main fields |
|---|---|
| `run_start` | `recipe`, `lane`, `harness`, `harness_version`, `adapter_verified`, `task`, `resumes`, `config_sha256`, `base` |
| `delegation` | `delegation_id`, `step`, `role`, `tier`, `model_requested`, `model_source`, `mode`, `enforcement`, `brief_fields` |
| `delegation_close` | `delegation_id`, `outcome`, `verdict`, token and cost fields |
| `check` | `check_id`, `command`, `exit_code`, `output_sha256`, `output_path`, `tool_version`, `version_ok`, `waiver`; security checks add `security_source` and `delta_base` |
| `decision` | `step`, `choice`, `reason`, `alternatives` |
| `pass` | `profile`, `gates`, `verdict`, `verifier` |
| `run_end` | `status`: `done`, `paused`, or `failed` |

**Commands.** The `trace` script has these commands: `detect`, `setup`, `start`, `begin`, `brief`, `close`, `check`, `verify-head`, `decision`, `pass`, `end`, `finish`, `report`, and `prune`. The `begin` command joins `detect`, `setup`, and `start`, and pins `<base>`. The `verify-head` command runs the tests, the diff, the size count for gate 7, and the three scans. The `finish` command joins `pass`, `end`, and `report`. Why: each `trace` call is one model turn, so the compound commands cut turns.

- No event means no brief, because the brief text comes only from `trace brief`.
- The status `done` needs a last pass with `PASS` or `PASS+NOTES`.
- A run is complete when it has `run_start`, `run_end`, and a close for each delegation. A `paused` run counts as complete.
- All worktrees share one current-run pointer, so the harness map asks for one Cheffy session for each repository.

**Report.** The `report` command summarizes each run: lane, status, delegations by role, passes, and usage coverage. Its flags show gaps, withheld brief fields, weak pass evidence, and security checks that need a line in the reply. It lists the waivers with their status.

**Usage and cost.** The token and cost fields are always `null` now. Hidkit never estimates them. Why: Claude Code documents no per-subagent token total, and an estimate would look like evidence.

### Secret protection

- **Redact on write.** The `trace` script redacts commands, outputs, and free-text fields before it writes. It covers known token formats, secret assignments and CLI flags, URL and header credentials, and secret environment values of 8 or more characters. The `output_sha256` field hashes the redacted output.
- **Ignored path only.** The `trace setup` command adds `.hidkit/` to the repo-local exclude file, which every worktree sees and no diff shows. Cheffy MUST NOT edit the tracked `.gitignore` for this. The script writes nothing to a path that `git check-ignore` does not confirm.
- **No symlinks.** The script refuses a symlinked `.hidkit/` path and opens files with `O_NOFOLLOW`.
- **Permissions.** Directories get mode `0700`, and files get mode `0600`.
- **Retention.** The `prune` command deletes check logs older than `ledger.retention_days` (default 30). Events stay, because they are small and redacted.
- **Tests.** The tests plant secrets of each format and assert that none reaches disk.

Pattern redaction is not complete, so the layers stack: the ignore check, the scan before commit, retention, and permissions. The ledger is tamper-evident only by instruction, because any role with a shell can append to it.

## 13. Harness adapters

Skills name actions, never tools. Each harness map in `references/harness/` translates the actions into the tools of one harness, such as `delegate`, `todo`, `run-shell`, and `create-worktree`. Why: the skills stay the same on every harness, and only the map changes.

The shipped map is `claude-code.md`. The skill is `/hidkit:cheffy`, and `disable-model-invocation: true` blocks automatic loading. The tiers resolve to `opus` and `sonnet`. The map has no lifecycle hooks and no usage source.

- **Verified with.** The `start` command and `doctor` compare `verified_with` with the installed harness version. On a mismatch, every enforcement drops to `instructed`.
- **Smoke tests.** The script `smoke-claude-code.mjs` checks the critical claims of the map in a real session. It spends subscription tokens, so it runs on demand.
- **No tool names in skills.** The `lint` script fails on a harness tool name in `skills/` outside the maps. The `tools` frontmatter of role files is the one exception, because the harness reads that field.

Before a map changes, its author verifies the format in the official harness documentation. Why: a format written from memory fails silently.

## 14. Writing standard

The `plating` skill holds the writing standard for every prose file and message.

- English follows ASD-STE100: active voice, imperative instructions, and one meaning for each word.
- The file path sets the text type. Files under `skills/` and `agents/` are procedural, with a soft limit of 20 words for each sentence. Every other file and the reply are descriptive, with a soft limit of 25 words.
- Spanish follows Español Técnico Simplificado, RFC 2119 keywords, UNE-ISO 24495-1:2024, and ISO 704:2022, in that order.
- RFC 2119 keywords are uppercase. The glossary defines each term and lists the synonyms not to use.
- Hidkit paraphrases ASD-STE100, ETS, and UNE-ISO, because their texts are not free to reproduce.

Why: short, literal sentences are easier for a model to follow and for a non-native reader to understand.

**Instruction budget.** More rules make each rule weaker. The `lint` script enforces a word budget on each model-facing file. The file `lint.config.json` holds the budgets and the other lint settings.

The `lint` script also checks sentence length, RFC 2119 keywords, banned words, rejected synonyms, file structure, links, and tool names.

## 15. Attribution

The `NOTICE` file names the parts that Hidkit derives from pstack, and reproduces the pstack copyright line and the full MIT permission notice. Why: MIT requires both texts in all copies or substantial portions. No license for Hidkit itself is chosen yet.

## 16. Verification of Hidkit

1. **Unit tests.** The `npm test` command runs `node:test` with no dependencies, including the planted-secret tests.
2. **Repo lint.** The `npm run lint` command runs `lint` on `skills/`, `agents/`, and `GLOSSARY.md`.
3. **Smoke tests.** The smoke script checks the harness map claims (section 13).
4. **Measurement eval.** The measurement eval lives in this repository, under `eval/`.

## 17. Risks

- **Cheffy judges its own work.** The Verifier closes gate 1, and the Critic and the Verifier get blind briefs.
- **Prompt injection.** Trust levels and the data rule (5.6), and least privilege (section 10).
- **Secrets in the ledger.** The layers of section 12.
- **The model skips a `trace` call.** Briefs come only from `trace brief`, and the pass refuses gaps.
- **A harness format changes silently.** The `verified_with` check, smoke tests, and the tool-name lint.
- **Ceremony without gain.** Lanes, the Critic by risk, the delegation rule, the budget, and progressive loading.

## 18. Later phases

- More recipes: Investigation, Refactoring, Prototype, Review, Plan, Skill authoring, Hillclimb, Opening a PR, Babysit, Shipping, Worktree cleanup, Pause, and Session pickup.
- More principles, each added when a shipped file links it.
- Harness maps and manifests for Cursor, Codex, and Gemini.
- External roles through another harness CLI, for model-family diversity.
- Per-delegation token usage from OpenTelemetry events, with cost from a dated price table.
- Lifecycle hooks that write `delegation_close` events.
- A hash chain or an HMAC key that makes the ledger tamper-evident.
- A CI workflow for the tests and `lint`.
- Automations, such as issue triage, and OpenTelemetry export of the ledger.
