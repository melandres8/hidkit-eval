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
   - The host never runs git in the `.git` dir of the candidate, because each file in it can make git run a command. The host keeps its own git dir under `~/.cache`, with the work dir as its work tree. Git runs without the global and system config, without an attributes file, and with fsmonitor, hooks, external diff, and textconv off.
   - Before each candidate and judge run, the runner checks that no `CLAUDE.md`, `CLAUDE.local.md`, or `.claude` dir sits in a parent dir. A candidate could plant one to inject text into later runs.
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
| 3 | `doodle-session-b.txt` | The user wants sketchbook paper once. The model forgets once to look at the PNG, which the skill already requires. | A task preference and a single model slip. The taste check asks only about cut labels, so a patch that checks every element at the edges is allowed. No other patch. |

Case 2 catches a sharpener that always proposes a change. Case 3 catches one that turns a one-time preference or a single slip into a rule.

## Rolling-boil

Rolling-boil animates a doodle. Its cases give it a drawing SVG and a request. A good output marks the moving parts with `data-motion` groups in a copy of the drawing, runs `motion.mjs`, and keeps the drawing SVG unchanged. The sandbox can block headless Chrome, so the cases grade the animation source and the animated SVG, not the GIF.

| id | Input | Trap | Good output |
|---|---|---|---|
| 1 | `plant.svg` | The user asks for life with no motion named. | One main motion that serves the idea, such as a sway from the pot or a falling leaf, and at most 2 small ones. A reply in Spanish that says the GIF is for Substack. |
| 2 | `coffee.svg` | The user asks for a blink and steam, with little motion. | A blink with the open and the closed face, steam in a flow group from the cup up, and no other motion. |
| 3 | `plant.svg` | The user asks in English for the drawing to draw itself. | A run with `--draw`. |
| 4 | none | The user has only a PNG. | No animation of the PNG. A request for the drawing SVG, or an offer to draw the scene again with doodle. |
| 5 | `plant.final.svg` | The user has only the final SVG of doodle. | The drawing extracted from the `doodle-ink` group, with no filter and one copy of the lines, and a run of `motion.mjs`. No request for another file. |
| 6 | `coffee.svg` | The user wants the character to sweat. | Drops in a `swap` of 3 poses with `data-period` 1.2, from the head outward, each at least 30 units wide at full size. No `pulse`. |
| 7 | `coffee.svg` | The user wants a tiny spark. | An enlarged ffmpeg crop of the spark from the frame sheet before the reply. When the sandbox blocks Chrome, a reply that says the frames were not checked. |
| 8 | `plant.svg` | The user wants a heart that beats. | The heart in a `pulse` group, not in a `swap`. |

Case 2 catches a model that adds motion that the user did not ask for. Case 4 catches one that animates an input that the skill does not take.

Cases 5 to 7 come from the sharpener session of 2026-10-10 on `rata-cubiculo`. Case 8 is a keep case: it catches a particle rule that turns every small motion into a `swap`.
