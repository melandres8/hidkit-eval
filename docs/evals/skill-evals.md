# Skill evals

The skill evals check one Hidkit skill at a time. Each case runs twice: once with the skill, and once with the same plugin without the skill. A judge then grades each expectation of the case. These evals measure the quality of the output of a skill. They do not measure whether the skill triggers, because the with_skill arm invokes the skill by name.

> Resumen: cada skill de Hidkit guarda aquí sus casos de prueba. El runner compara la salida con la skill y sin ella, y un juez califica cada expectativa.

## Layout

| Path | Content |
|---|---|
| `eval/skills/<skill>/evals.json` | The cases of one skill, in the skill-creator schema: `id`, `prompt`, `expected_output`, `files`, `expectations`. |
| `eval/skills/<skill>/files/` | The input files of the cases, such as session transcripts. |
| `eval/skills/run.mjs` | The runner. |
| `eval/skills/judge-prompt.md`, `eval/skills/judge-schema.json` | The judge of the expectations. |
| `eval/lib/skills.mjs` | Helpers without model calls, with unit tests in `test/eval-skills.test.mjs`. |

`files` paths are relative to `eval/skills/<skill>/`. The runner checks `evals.json` with `skills/sharpener/scripts/cases.mjs` from the Hidkit checkout, so the skill and the eval use one schema.

## How a run works

1. The runner copies the plugin entries of the Hidkit checkout into a new directory. It leaves out each `skills/*/evals` directory. The without_skill arm also leaves out `skills/<skill>`.
2. It copies the files of the case into `transcripts/` in that directory, and commits the directory as the base.
3. It starts `claude -p` in that directory, with a second copy as the plugin. Claude Code denies each edit inside a loaded plugin directory, so one shared directory would block every edit. The with_skill arm starts the prompt with `/hidkit:<skill>`.
4. The candidate settings of `eval/config.json` apply: the sandbox, the deny rules on this repository, and the dedicated config directory without an API key. The runner also denies reads of the Hidkit checkout and its main checkout, so the without_skill arm cannot read the skill. Edit and Write work only inside the work dir.
   - The work dir has a random name, so a run cannot plant files in a later run.
   - The plugin copy is in `~/.cache/hidkit-eval-plugin-*`, where no candidate can write, because a plugin can carry hooks and hooks run outside the sandbox. The runner checks a hash of the copy before each run.
   - Before the runner runs git in the work dir, it puts back the git config, removes hooks, and rebuilds the index. Git runs with fsmonitor, hooks, external diff, and textconv off.
   - The runner deletes the work dir and the plugin copy after each run. No prompt suffix is added. In `-p` mode nobody answers, so a skill that asks for approval ends its reply with the question.
5. An expectation of the form `No file under <path> changed.` is graded from a hash of each file before and after the run, and from each edit call on that path, denied or not. The judge grades the other expectations. It sees the request, the transcripts, the description of a good output, the reply, and the diff. The skill name is replaced with a neutral word.
6. Each run directory holds `stream.jsonl`, `reply.md`, `diff.patch`, `judges.json`, and `grading.json` in the skill-creator shape.

## Usage

Every run spends subscription tokens. Use `--dry-run` first: it stages the directories and prints the commands without a model call.

```bash
HIDKIT_DIR=../hidkit node eval/skills/run.mjs --skill sharpener --dry-run
HIDKIT_DIR=../hidkit node eval/skills/run.mjs --skill sharpener --eval 1 --arms with_skill
HIDKIT_DIR=../hidkit node eval/skills/run.mjs --skill sharpener
```

Options: `--eval <id>`, `--arms with_skill,without_skill`, `--repeats <n>` (default 1), `--judge-repeats <n>` (default 1).

One repeat and one judge give a judgment, not a measurement. A claim of a gain above noise needs repeats and two judges, as the rules of the measurement eval state.

## Sharpener

Sharpener sharpens a skill with the corrections and approvals of a session. Its cases give it a session transcript and a request. A good output is a proposal that waits for approval, not an edit.

| id | Transcript | Trap | Good output |
|---|---|---|---|
| 1 | `doodle-session-a.txt` | The user corrects the size of diagram labels in 2 uses. The user also wants kraft paper for one post. | The style guide already sets the label size, so the corrections show a repeated model slip. A patch that makes the rule harder to miss, tied to the size of the sheet. Kraft paper is a task preference. A proposal and regression cases, with no edit. |
| 2 | `fill-me-in-session.txt` | The user approves both uses with no correction. | No skill defect and no patch. |
| 3 | `doodle-session-b.txt` | The user wants sketchbook paper once. The model forgets once to look at the PNG, which the skill already requires. | A task preference and a single model slip. No patch. |

Cases 2 and 3 catch a sharpener that always proposes a change.
