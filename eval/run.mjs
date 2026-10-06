#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runGrader } from './lib/grader.mjs';
import { ledgerCommands } from './lib/ledger-commands.mjs';
import {
  PLUGIN_ENTRIES, answerAccess, buildEnv, buildMeta, checkApiKeySource, checkModels, checkScenarios, executedCommands, freshJudgeDir, judgeInput,
  parseOptions, reproVerdict, selectScenarios, setDir,
} from './lib/harness.mjs';

const EVAL_DIR = path.dirname(fileURLToPath(import.meta.url));
// ROOT is this repo: it holds graders and references, which no candidate may read.
const ROOT = path.dirname(EVAL_DIR);
// HIDKIT is the Hidkit checkout under measurement. Set HIDKIT_DIR, or keep it next to this repo.
const HIDKIT = path.resolve(process.env.HIDKIT_DIR ?? path.join(ROOT, '..', 'hidkit'));
if (!fs.existsSync(path.join(HIDKIT, 'skills/cheffy/SKILL.md'))) {
  console.error(`No Hidkit checkout at ${HIDKIT}. Set HIDKIT_DIR to the Hidkit repo.`);
  process.exit(2);
}
const TRACE = path.join(HIDKIT, 'skills/cheffy/scripts/trace.mjs');
const config = JSON.parse(fs.readFileSync(path.join(EVAL_DIR, 'config.json'), 'utf8'));
const options = parseOptions(process.argv.slice(2));
// Each set has its own scenarios.json, fixtures/ and graders/. v1 keeps its place in eval/.
const SET_DIR = setDir(EVAL_DIR, options.set);
const scenarios = JSON.parse(fs.readFileSync(path.join(SET_DIR, 'scenarios.json'), 'utf8'));
const scenarioProblems = checkScenarios(scenarios, options.set);
if (scenarioProblems.length) {
  console.error(`scenarios.json of set ${options.set} is not usable:\n${scenarioProblems.join('\n')}`);
  process.exit(2);
}
const judgePrompt = fs.readFileSync(path.join(EVAL_DIR, 'judge-prompt.md'), 'utf8');
const judgeSchema = fs.readFileSync(path.join(EVAL_DIR, 'judge-schema.json'), 'utf8');
const JUDGE_CLAIMS = ['scope', 'redundancy', 'evidence', 'readability', 'security_report'];

// Isolation: every claude process uses a dedicated config directory, so no user plugin leaks in.
// ANTHROPIC_API_KEY is removed so that no run can bill the API: runs use the subscription login of that directory.
const CONFIG_DIR = config.config_dir.replace(/^~(?=$|\/)/, os.homedir());
const CLAUDE_ENV = buildEnv(process.env, CONFIG_DIR, os.homedir());
// Both arms run Bash in the OS sandbox with auto-allow: chained commands, heredocs and rm in the work dir run without a
// prompt, so neither arm is handicapped by the allowlist. Writes stay in the work dir and temp, Bash cannot read the repo
// (graders and references), there is no network, and a command never falls back to running unsandboxed.
const CANDIDATE_SETTINGS = JSON.stringify(config.candidate_settings).replaceAll('{repo}', JSON.stringify(ROOT).slice(1, -1));
// One temp root holds work dirs, the plugin copy, and repro copies, apart from earlier evals.
// The prefix is neutral: the candidate sees this path, and it must not show that the task is measured.
const EVAL_ROOT = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-')));
const PLUGIN_COPY = path.join(EVAL_ROOT, 'plugin');
// The Edit/Write deny rules on /Users also block sandboxed writes there, so semgrep cannot write ~/.semgrep.
// Both arms get config and cache homes in one dir that --add-dir opens to sandboxed writes.
const XDG_ROOT = path.join(EVAL_ROOT, 'xdg');
for (const [key, dir] of [['XDG_CONFIG_HOME', 'config'], ['XDG_CACHE_HOME', 'cache']]) {
  CLAUDE_ENV[key] = path.join(XDG_ROOT, dir);
  fs.mkdirSync(CLAUDE_ENV[key], { recursive: true });
}
// The Cheffy arm gets a copy without graders, fixtures, references, or results.
function stagePlugin() {
  fs.mkdirSync(PLUGIN_COPY, { recursive: true });
  for (const name of PLUGIN_ENTRIES) {
    fs.cpSync(path.join(HIDKIT, name), path.join(PLUGIN_COPY, name), { recursive: true });
  }
}
let counter = 0;

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const TEST_FILE = /\.test\.[cm]?[jt]s$/;

class HarnessError extends Error {}

function prepare(scenario) {
  const dir = path.join(path.join(EVAL_ROOT, `work-${counter += 1}`), scenario.project);
  fs.cpSync(path.join(SET_DIR, 'fixtures', scenario.fixture), dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'hidkit.config.yaml'), `tiers:\n  strong: ${config.candidate_model}\n  fast: ${config.candidate_model}\n`);
  git(dir, 'init', '-q');
  git(dir, 'add', '-A');
  git(dir, '-c', 'user.email=dev@example.com', '-c', 'user.name=dev', 'commit', '-q', '-m', 'initial');
  return { dir, base: git(dir, 'rev-parse', 'HEAD') };
}

function claude(cwd, args, input = undefined) {
  const res = spawnSync('claude', args, { cwd, input, encoding: 'utf8', timeout: config.timeout_ms, maxBuffer: 256 * 1024 * 1024, env: CLAUDE_ENV });
  return { code: res.status, stdout: res.stdout ?? '', error: res.error?.message ?? null };
}

function parseStream(stdout) {
  const events = stdout.split('\n').filter(Boolean).flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
  return {
    init: events.find((e) => e.type === 'system' && e.subtype === 'init') ?? null,
    result: events.findLast((e) => e.type === 'result') ?? null,
    commands: executedCommands(events),
    events,
  };
}

// A run that did not complete (auth failure, timeout, API error) is a harness error, never a quality result.
function assertCompleted(run, stream, label) {
  if (run.code !== 0 || !stream.result || stream.result.is_error) {
    throw new HarnessError(`${label} did not complete: ${stream.result?.result ?? run.error ?? `exit ${run.code}`}`);
  }
}

function assertIsolation(init, arm) {
  const text = JSON.stringify(init ?? {}).toLowerCase();
  const forbidden = [...config.forbidden_markers, ...(arm === 'baseline' ? config.baseline_forbidden_markers : [])];
  const leaked = forbidden.filter((m) => text.includes(m));
  const missing = config.required_markers[arm].filter((m) => !text.includes(m));
  if (!init || leaked.length || missing.length) {
    throw new HarnessError(`isolation failed for ${arm}: leaked [${leaked.join(', ')}], missing [${missing.join(', ')}]`);
  }
}

function passes(file, dir, base) {
  try {
    return runGrader(path.join(SET_DIR, 'graders', file), { evalDir: EVAL_DIR, candidateDir: dir, baseRef: base }).passed;
  } catch (error) {
    throw new HarnessError(error.message);
  }
}

function reproClaim(scenario, dir, base) {
  if (!scenario.repro) return null;
  const tests = git(dir, 'diff', '--cached', '--name-only', base).split('\n')
    .filter((f) => TEST_FILE.test(f) && fs.existsSync(path.join(dir, f)));
  if (tests.length === 0) return false;
  const original = prepare(scenario).dir;
  try {
    for (const f of tests) {
      fs.mkdirSync(path.dirname(path.join(original, f)), { recursive: true });
      fs.copyFileSync(path.join(dir, f), path.join(original, f));
    }
    const tap = (cwd) => spawnSync(process.execPath, ['--test', '--test-isolation=none', '--test-reporter=tap', ...tests], { cwd, encoding: 'utf8', timeout: 120_000, killSignal: 'SIGKILL' }).stdout ?? '';
    return reproVerdict(tap(original), tap(dir));
  } finally {
    fs.rmSync(path.dirname(original), { recursive: true, force: true });
  }
}

let judgeCostUsd = 0;

function judge(scenario, patch, reply, commands) {
  const input = judgeInput({ judgePrompt, scenario, patch, reply, commands, maxPatchChars: config.max_patch_chars });
  const cwd = freshJudgeDir();
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
  if (run.code !== 0 || output.is_error || !output.structured_output) {
    throw new HarnessError(`judge did not complete: ${output.result ?? run.error ?? `exit ${run.code}`}`);
  }
  judgeCostUsd += output.total_cost_usd ?? 0;
  const verdict = output.structured_output;
  verdict.security_report = scenario.security ? verdict.security_report === true : null;
  return verdict;
}

const judgeRun = (scenario, patch, reply, commands) => Array.from({ length: options.judgeRepeats ?? config.judge_repeats }, () => judge(scenario, patch, reply, commands));

function applyJudges(claims, judges) {
  for (const key of JUDGE_CLAIMS) claims[key] = judges.length === 0 || judges.some((j) => j[key] === null) ? null : judges.every((j) => j[key] === true);
}

// --judge-only <results dir>: judge the stored runs of an earlier eval again, without new candidate runs.
// The candidate output (diff.patch, stream.jsonl) is read back; records and results.jsonl are rewritten in place.
function judgeStored(resultsDir) {
  const meta = JSON.parse(fs.readFileSync(path.join(resultsDir, 'meta.json'), 'utf8'));
  if (meta.set !== options.set) throw new Error(`results are from set ${meta.set}, not ${options.set}: pass --set ${meta.set}`);
  const byId = new Map(scenarios.map((s) => [s.id, s]));
  const lines = fs.readFileSync(path.join(resultsDir, 'results.jsonl'), 'utf8').split('\n').filter(Boolean);
  const records = lines.map((line) => JSON.parse(line));
  // results.jsonl is rewritten after each run, so a stop part way keeps the runs judged so far.
  const save = () => fs.writeFileSync(path.join(resultsDir, 'results.jsonl'), records.map((r) => `${JSON.stringify(r)}\n`).join(''));
  for (const record of records) {
    const scenario = byId.get(record.scenario);
    // A run that already has judges keeps them: a rerun after a stop judges only what is left.
    if (!scenario || (options.scenario && scenario.id !== options.scenario) || record.judges?.length) continue;
    const runDir = path.join(resultsDir, `${record.scenario}-${record.arm}-${record.repeat}`);
    const stream = parseStream(fs.readFileSync(path.join(runDir, 'stream.jsonl'), 'utf8'));
    const patch = fs.readFileSync(path.join(runDir, 'diff.patch'), 'utf8');
    // The work dir is in the OS temp dir, so the ledger can be gone; then the judge sees the tool calls only.
    const ledger = record.workdir && fs.existsSync(record.workdir) ? ledgerCommands(record.workdir) : [];
    const judges = judgeRun(scenario, patch, stream.result?.result ?? '', [...stream.commands, ...ledger]);
    applyJudges(record.claims, judges);
    record.judges = judges.map((j) => Object.fromEntries(JUDGE_CLAIMS.map((k) => [k, j[k]])));
    fs.writeFileSync(path.join(runDir, 'judges.json'), JSON.stringify(judges, null, 2));
    fs.writeFileSync(path.join(runDir, 'record.json'), JSON.stringify(record, null, 2));
    save();
    console.log(`${record.scenario} ${record.arm} #${record.repeat}: ${JUDGE_CLAIMS.map((k) => `${k}=${record.claims[k]}`).join(' ')}`);
  }
}

function cheffyHard(scenario, dir, claims) {
  let ledgerComplete = false;
  let lanes = [];
  try {
    const report = JSON.parse(execFileSync(process.execPath, [TRACE, 'report', '--all'], { cwd: dir, encoding: 'utf8' }));
    ledgerComplete = report.runs.length > 0 && report.runs.every((r) => r.flags.length === 0);
    lanes = report.runs.map((r) => r.lane);
  } catch {
    // No readable ledger means Cheffy did not record its run: fail closed.
  }
  const hard = { ledger_complete: ledgerComplete };
  if (scenario.expect_lane) hard.lane = lanes.includes(scenario.expect_lane);
  if (scenario.security) hard.injection_resisted = claims.injection === true;
  return hard;
}

function runOne(scenario, arm, repeat, outDir) {
  const { dir, base } = prepare(scenario);
  const prompt = `${arm === 'cheffy' ? `${config.cheffy_invocation} ` : ''}${scenario.prompt} ${config.prompt_suffix}`;
  const isolation = config.isolation[arm].map((a) => a.replace('{root}', PLUGIN_COPY));
  const run = claude(dir, ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--model', config.candidate_model,
    '--permission-mode', 'dontAsk', '--allowedTools', config.allowed_tools.join(','), '--settings', CANDIDATE_SETTINGS,
    '--add-dir', XDG_ROOT, ...isolation]);
  const stream = parseStream(run.stdout);
  assertCompleted(run, stream, `${scenario.id} ${arm} #${repeat}`);
  assertIsolation(stream.init, arm);
  let background;
  try {
    checkApiKeySource(stream.init);
    background = checkModels(stream.result.modelUsage, config.candidate_model).background_models;
  } catch (error) {
    throw new HarnessError(`${scenario.id} ${arm} #${repeat}: ${error.message}`);
  }
  git(dir, 'add', '-A');
  const patch = git(dir, 'diff', '--cached', base);
  const claims = {
    hidden: passes(scenario.graders.hidden, dir, base),
    repro: reproClaim(scenario, dir, base),
    injection: scenario.graders.injection ? passes(scenario.graders.injection, dir, base) : null,
  };
  // Runs for both arms. ROOT is the repo: the candidate works in a temp copy and never needs a path in it.
  const answerMatches = answerAccess(stream.events, ROOT);
  // --no-judge serves the headroom pilot: only the programmatic claims count there.
  const judges = options.judge ? judgeRun(scenario, patch, stream.result.result ?? '', [...stream.commands, ...ledgerCommands(dir)]) : [];
  applyJudges(claims, judges);
  const record = {
    scenario: scenario.id, arm, repeat, claims,
    judges: judges.map((j) => Object.fromEntries(JUDGE_CLAIMS.map((k) => [k, j[k]]))),
    accepted: claims.hidden === true,
    cost_usd: stream.result.total_cost_usd ?? null,
    usage: stream.result.usage ?? null,
    hard: { answer_access: answerMatches.length === 0, ...(arm === 'cheffy' ? cheffyHard(scenario, dir, claims) : {}) },
    answer_access_matches: answerMatches,
    background_models: background,
    exit_code: run.code,
    workdir: dir,
  };
  const runDir = path.join(outDir, `${scenario.id}-${arm}-${repeat}`);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, 'stream.jsonl'), run.stdout);
  fs.writeFileSync(path.join(runDir, 'diff.patch'), patch);
  fs.writeFileSync(path.join(runDir, 'judges.json'), JSON.stringify(judges, null, 2));
  fs.writeFileSync(path.join(runDir, 'record.json'), JSON.stringify(record, null, 2));
  return record;
}

if (options.judgeOnly) {
  try {
    judgeStored(path.resolve(options.judgeOnly));
    console.log(`judge cost_usd=${judgeCostUsd}`);
  } catch (error) {
    console.error(`judge-only stopped: ${error.message}`);
    process.exit(3);
  }
  process.exit(0);
}

const selected = selectScenarios(scenarios, options);
const { arms } = options;
const repeats = options.repeats ?? config.repeats;
const outDir = path.join(EVAL_DIR, 'results', `${options.set}-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(outDir, { recursive: true });
// The run records its noise statistic, so a later change to the statistic never changes the verdict of this run.
const noiseStatistic = { name: 'stratified-bootstrap', ...config.bootstrap };
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ ...buildMeta({ set: options.set, split: options.split, filter: options.scenario, scenarios: selected, arms, repeats, sandbox: config.candidate_settings.sandbox?.enabled === true }), noise_statistic: noiseStatistic }, null, 2));
stagePlugin();
try {
  for (const scenario of selected) {
    for (const arm of arms) {
      for (let repeat = 0; repeat < repeats; repeat += 1) {
        const record = runOne(scenario, arm, repeat, outDir);
        fs.appendFileSync(path.join(outDir, 'results.jsonl'), `${JSON.stringify(record)}\n`);
        console.log(`${scenario.id} ${arm} #${repeat}: hidden=${record.claims.hidden} cost_usd=${record.cost_usd}`);
      }
    }
  }
} catch (error) {
  if (!(error instanceof HarnessError)) throw error;
  fs.appendFileSync(path.join(outDir, 'harness-errors.log'), `${error.message}\n`);
  console.error(`harness error, stopping the eval: ${error.message}`);
  console.error(`results so far: ${outDir}`);
  process.exit(3);
}
console.log(`results: ${outDir}`);
