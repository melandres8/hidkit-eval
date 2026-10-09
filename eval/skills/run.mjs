#!/usr/bin/env node
// Runs the evals of one Hidkit skill: each case with the skill and without it, then grades each expectation.
// Usage: node eval/skills/run.mjs --skill <name> [--eval <id>] [--arms with_skill,without_skill] [--repeats n] [--judge-repeats n] [--dry-run]
// The cases are in eval/skills/<name>/evals.json, in the skill-creator schema. The output follows its grading.json shape.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { answerAccess, buildEnv, checkApiKeySource, checkModels, freshJudgeDir } from '../lib/harness.mjs';
import { changedPaths, plantedMemory, privateDir, safeGit, trackWorkDir, trackedDiff, treeManifest } from '../lib/isolation.mjs';
import {
  attemptedEdits, candidateSettings, candidateTools, candidatePrompt, checkVerdict, gradePaths, mergeJudges, parseSkillOptions, skillIsolation, skillJudgeInput, splitExpectations, stageRunDir, summarize,
} from '../lib/skills.mjs';

const SKILLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const EVAL_DIR = path.dirname(SKILLS_DIR);
const ROOT = path.dirname(EVAL_DIR);
const HIDKIT = path.resolve(process.env.HIDKIT_DIR ?? path.join(ROOT, '..', 'hidkit'));
const options = parseSkillOptions(process.argv.slice(2));
const SET_DIR = path.join(SKILLS_DIR, options.skill);
if (!fs.existsSync(path.join(HIDKIT, 'skills', options.skill, 'SKILL.md'))) {
  console.error(`No skill ${options.skill} in the Hidkit checkout at ${HIDKIT}. Set HIDKIT_DIR.`);
  process.exit(2);
}

// The validator of sharpener checks the cases, so the eval and the skill agree on one schema.
const { checkCases } = await import(pathToFileURL(path.join(HIDKIT, 'skills/sharpener/scripts/cases.mjs')).href);
const data = JSON.parse(fs.readFileSync(path.join(SET_DIR, 'evals.json'), 'utf8'));
const problems = checkCases(data, SET_DIR);
if (problems.length) {
  console.error(`evals.json of ${options.skill} is not usable:\n${problems.join('\n')}`);
  process.exit(2);
}
const cases = data.evals.filter((c) => options.evalId === null || c.id === options.evalId);
if (cases.length === 0) {
  console.error(`no case with id ${options.evalId}`);
  process.exit(2);
}

const config = JSON.parse(fs.readFileSync(path.join(EVAL_DIR, 'config.json'), 'utf8'));
const judgePrompt = fs.readFileSync(path.join(SKILLS_DIR, 'judge-prompt.md'), 'utf8');
const judgeSchema = fs.readFileSync(path.join(SKILLS_DIR, 'judge-schema.json'), 'utf8');
const CONFIG_DIR = config.config_dir.replace(/^~(?=$|\/)/, os.homedir());
const CLAUDE_ENV = buildEnv(process.env, CONFIG_DIR, os.homedir());
// The candidate cannot read the Hidkit checkout, its main checkout when it is a worktree, or this repository.
// Otherwise the without_skill arm could read the skill under measurement.
const HIDKIT_MAIN = path.dirname(safeGit(HIDKIT, 'rev-parse', '--path-format=absolute', '--git-common-dir'));
const CANDIDATE_SETTINGS = JSON.stringify(candidateSettings(config.candidate_settings, [ROOT, HIDKIT, HIDKIT_MAIN]));
// The candidate sees this path, so the prefix is neutral.
const EVAL_ROOT = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-')));
const XDG_ROOT = path.join(EVAL_ROOT, 'xdg');
for (const [key, dir] of [['XDG_CONFIG_HOME', 'config'], ['XDG_CACHE_HOME', 'cache']]) {
  CLAUDE_ENV[key] = path.join(XDG_ROOT, dir);
  fs.mkdirSync(CLAUDE_ENV[key], { recursive: true });
}

class HarnessError extends Error {}
const git = safeGit;

// The work dir and the plugin dir are two copies. Claude Code denies each edit inside a loaded plugin dir, so a candidate
// that shares them can never edit, and the diff check passes for free. The work dir is the copy that the candidate edits.
// The work dir has a random name, so no candidate can plant files in a later run. The plugin dir is under the home
// cache, where no candidate can write, because a plugin can carry hooks and hooks run outside the sandbox.
function prepare(testCase, arm) {
  const root = fs.mkdtempSync(path.join(EVAL_ROOT, 'work-'));
  const dir = path.join(root, 'hidkit');
  const pluginDir = privateDir('hidkit-eval-plugin-');
  stageRunDir({ hidkit: HIDKIT, dest: dir, skill: options.skill, arm, files: testCase.files ?? [], setDir: SET_DIR });
  stageRunDir({ hidkit: HIDKIT, dest: pluginDir, skill: options.skill, arm, files: [], setDir: SET_DIR });
  git(dir, 'init', '-q');
  git(dir, 'add', '-A');
  git(dir, '-c', 'user.email=dev@example.com', '-c', 'user.name=dev', 'commit', '-q', '-m', 'initial');
  return {
    root, dir, pluginDir, track: trackWorkDir(dir),
    pluginManifest: treeManifest(pluginDir), workManifest: treeManifest(dir, ['.git']),
  };
}

const cleanup = (run) => {
  fs.rmSync(run.root, { recursive: true, force: true });
  fs.rmSync(run.pluginDir, { recursive: true, force: true });
  fs.rmSync(run.track.gitDir, { recursive: true, force: true });
};
process.on('exit', () => fs.rmSync(EVAL_ROOT, { recursive: true, force: true }));

function claude(cwd, args, input = undefined) {
  const res = spawnSync('claude', args, { cwd, input, encoding: 'utf8', timeout: config.timeout_ms, maxBuffer: 256 * 1024 * 1024, env: CLAUDE_ENV });
  return { code: res.status, stdout: res.stdout ?? '', error: res.error?.message ?? null };
}

const candidateArgs = (dir, pluginDir, prompt) => ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--model', config.candidate_model,
  '--permission-mode', 'dontAsk', '--allowedTools', candidateTools(config.allowed_tools, dir).join(','), '--settings', CANDIDATE_SETTINGS,
  '--add-dir', XDG_ROOT, '--strict-mcp-config', '--plugin-dir', pluginDir];

function parseStream(stdout) {
  const events = stdout.split('\n').filter(Boolean).flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
  return { events, init: events.find((e) => e.type === 'system' && e.subtype === 'init') ?? null, result: events.findLast((e) => e.type === 'result') ?? null };
}

let judgeCostUsd = 0;

function judge(input, judged) {
  const cwd = freshJudgeDir();
  const planted = plantedMemory(cwd);
  if (planted.length) throw new HarnessError(`a CLAUDE.md or .claude dir sits above the judge dir: ${planted.join(', ')}`);
  let run;
  try {
    run = claude(cwd, ['-p', '--model', config.judge_model, '--output-format', 'json', '--json-schema', judgeSchema, ...config.judge_args], input);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
  let output;
  try {
    output = JSON.parse(run.stdout);
  } catch {
    throw new HarnessError(`judge returned no JSON: ${run.error ?? `exit ${run.code}`}`);
  }
  if (run.code !== 0 || output.is_error || !output.structured_output) throw new HarnessError(`judge did not complete: ${output.result ?? run.error ?? `exit ${run.code}`}`);
  judgeCostUsd += output.total_cost_usd ?? 0;
  const problem = checkVerdict(output.structured_output, judged);
  if (problem) throw new HarnessError(problem);
  return output.structured_output;
}

function runOne(testCase, arm, repeat, outDir) {
  const run = prepare(testCase, arm);
  try {
    return gradeRun(testCase, arm, repeat, outDir, run);
  } finally {
    cleanup(run);
  }
}

function gradeRun(testCase, arm, repeat, outDir, { dir, pluginDir, track, pluginManifest, workManifest }) {
  const label = `eval-${testCase.id} ${arm} #${repeat}`;
  const planted = plantedMemory(dir);
  if (planted.length) throw new HarnessError(`${label}: a CLAUDE.md or .claude dir sits above the work dir: ${planted.join(', ')}`);
  const pluginChanged = changedPaths(pluginManifest, treeManifest(pluginDir));
  if (pluginChanged.length) throw new HarnessError(`${label}: the plugin copy changed before the run: ${pluginChanged.join(', ')}`);
  const run = claude(dir, candidateArgs(dir, pluginDir, candidatePrompt(options.skill, arm, testCase.prompt)));
  const stream = parseStream(run.stdout);
  if (run.code !== 0 || !stream.result || stream.result.is_error) throw new HarnessError(`${label} did not complete: ${stream.result?.result ?? run.error ?? `exit ${run.code}`}`);
  const isolation = skillIsolation(stream.init, options.skill, arm, config.forbidden_markers);
  if (isolation.length) throw new HarnessError(`${label}: isolation failed: ${isolation.join(', ')}`);
  try {
    checkApiKeySource(stream.init);
    checkModels(stream.result.modelUsage, config.candidate_model);
  } catch (error) {
    throw new HarnessError(`${label}: ${error.message}`);
  }
  // The changed files come from a hash of each file, not from git, so a candidate cannot hide an edit in the index.
  const changed = changedPaths(workManifest, treeManifest(dir, ['.git']));
  const patch = trackedDiff(dir, track);
  const reply = stream.result.result ?? '';
  const { paths, judged } = splitExpectations(testCase.expectations);
  const transcripts = (testCase.files ?? []).map((f) => ({ name: path.basename(f), text: fs.readFileSync(path.join(SET_DIR, f), 'utf8') }));
  const input = skillJudgeInput({ judgePrompt, testCase, transcripts, reply, patch, judged, skill: options.skill, maxPatchChars: config.max_patch_chars });
  const verdicts = judged.length ? Array.from({ length: options.judgeRepeats }, () => judge(input, judged)) : [];
  const attempted = attemptedEdits(stream.events, dir);
  const expectations = [...mergeJudges(judged, verdicts), ...gradePaths(paths, [...new Set([...changed, ...attempted])])];
  const passed = expectations.filter((e) => e.passed).length;
  const answerMatches = answerAccess(stream.events, ROOT);
  const record = {
    eval_id: testCase.id, eval_name: `eval-${testCase.id}`, arm, repeat,
    summary: { passed, failed: expectations.length - passed, total: expectations.length, pass_rate: passed / expectations.length },
    expectations, changed, attempted_edits: attempted, answer_access: answerMatches.length === 0, answer_access_matches: answerMatches,
    cost_usd: stream.result.total_cost_usd ?? null, duration_ms: stream.result.duration_ms ?? null, usage: stream.result.usage ?? null, workdir: dir,
  };
  const runDir = path.join(outDir, `eval-${testCase.id}-${arm}-${repeat}`);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, 'stream.jsonl'), run.stdout);
  fs.writeFileSync(path.join(runDir, 'reply.md'), reply);
  fs.writeFileSync(path.join(runDir, 'diff.patch'), patch);
  fs.writeFileSync(path.join(runDir, 'judges.json'), JSON.stringify(verdicts, null, 2));
  fs.writeFileSync(path.join(runDir, 'grading.json'), JSON.stringify({ expectations, summary: record.summary }, null, 2));
  return record;
}

const plan = cases.flatMap((c) => options.arms.flatMap((arm) => Array.from({ length: options.repeats }, (_, repeat) => ({ c, arm, repeat }))));
if (options.dryRun) {
  for (const { c, arm } of plan) {
    const run = prepare(c, arm);
    const { paths, judged } = splitExpectations(c.expectations);
    console.log(JSON.stringify({ eval: c.id, arm, dir: run.dir, plugin: run.pluginDir,
      args: candidateArgs(run.dir, run.pluginDir, candidatePrompt(options.skill, arm, c.prompt)).filter((a) => a !== CANDIDATE_SETTINGS),
      skills: fs.readdirSync(path.join(run.dir, 'skills')), transcripts: fs.readdirSync(path.join(run.dir, 'transcripts')), judged: judged.length, by_diff: paths.length }));
    cleanup(run);
  }
  console.log(`settings: ${CANDIDATE_SETTINGS}`);
  console.log(`dry run: ${plan.length} candidate runs, ${plan.length * options.judgeRepeats} judge runs. Work dirs in ${EVAL_ROOT}`);
  process.exit(0);
}

const outDir = path.join(EVAL_DIR, 'results', `skills-${options.skill}-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ skill: options.skill, hidkit: HIDKIT, cases: cases.map((c) => c.id), arms: options.arms,
  repeats: options.repeats, judge_repeats: options.judgeRepeats, candidate_model: config.candidate_model, judge_model: config.judge_model, node: process.version }, null, 2));
const records = [];
try {
  for (const { c, arm, repeat } of plan) {
    const record = runOne(c, arm, repeat, outDir);
    records.push(record);
    fs.appendFileSync(path.join(outDir, 'results.jsonl'), `${JSON.stringify(record)}\n`);
    console.log(`eval-${c.id} ${arm} #${repeat}: ${record.summary.passed}/${record.summary.total} cost_usd=${record.cost_usd}`);
  }
} catch (error) {
  if (!(error instanceof HarnessError)) throw error;
  fs.appendFileSync(path.join(outDir, 'harness-errors.log'), `${error.message}\n`);
  console.error(`harness error, stopping the eval: ${error.message}`);
  console.error(`results so far: ${outDir}`);
  process.exit(3);
}
const summary = summarize(records);
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({ rows: summary, judge_cost_usd: judgeCostUsd }, null, 2));
for (const row of summary) console.log(`eval-${row.eval_id} ${row.arm}: ${row.passed}/${row.total} cost_usd=${row.cost_usd.toFixed(2)}`);
console.log(`judge cost_usd=${judgeCostUsd}`);
console.log(`results: ${outDir}`);
