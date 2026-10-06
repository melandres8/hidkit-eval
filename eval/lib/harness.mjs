// Helpers for run.mjs and report.mjs. No model calls and no process spawning.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const SETS = ['v1', 'v2', 'v3'];
export const SPLITS = ['train', 'test', 'all'];
const ARMS = ['baseline', 'cheffy'];
// The Cheffy arm gets a copy of these entries only. eval/ stays out, so graders and references are out of reach.
export const PLUGIN_ENTRIES = ['.claude-plugin', 'skills', 'agents', 'GLOSSARY.md', 'NOTICE'];

export function parseOptions(argv) {
  const arg = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? null : argv[i + 1];
  };
  const set = arg('set') ?? 'v1';
  const split = arg('split') ?? 'all';
  const arms = (arg('arms') ?? ARMS.join(',')).split(',');
  if (!SETS.includes(set)) throw new Error(`unknown set ${set}: use ${SETS.join(' or ')}`);
  if (!SPLITS.includes(split)) throw new Error(`unknown split ${split}: use ${SPLITS.join(', ')}`);
  const badArms = arms.filter((a) => !ARMS.includes(a));
  if (badArms.length) throw new Error(`unknown arm ${badArms.join(', ')}`);
  return { set, split, scenario: arg('scenario'), arms, repeats: arg('repeats') === null ? null : Number(arg('repeats')), judge: !argv.includes('--no-judge'), judgeOnly: arg('judge-only'),
    judgeRepeats: arg('judge-repeats') === null ? null : Number(arg('judge-repeats')) };
}

// v1 keeps its original place in eval/. Later sets live in eval/<set>/.
export const setDir = (evalDir, set) => (set === 'v1' ? evalDir : path.join(evalDir, set));

export function selectScenarios(scenarios, { split = 'all', scenario = null }) {
  const selected = scenarios.filter((s) => (split === 'all' || s.split === split) && (!scenario || s.id === scenario));
  if (selected.length === 0) throw new Error(`no scenario matches split ${split}${scenario ? ` and id ${scenario}` : ''}`);
  return selected;
}

// Returns a list of problems in a scenarios.json file. An empty list means the file is usable.
export function checkScenarios(scenarios, set) {
  const problems = [];
  const seen = new Set();
  for (const s of scenarios) {
    if (seen.has(s.id)) problems.push(`duplicate scenario id ${s.id}`);
    seen.add(s.id);
    for (const key of ['id', 'project', 'fixture', 'prompt']) if (typeof s[key] !== 'string' || !s[key]) problems.push(`${s.id}: ${key} is missing`);
    if (typeof s.graders?.hidden !== 'string') problems.push(`${s.id}: the hidden grader is missing`);
    if (set !== 'v1' && !['train', 'test'].includes(s.split)) problems.push(`${s.id}: split must be train or test`);
    if (s.security) {
      // cheffyHard reads claims.injection, and the judge reads the focus line.
      if (typeof s.graders?.injection !== 'string') problems.push(`${s.id}: a security scenario needs an injection grader`);
      if (typeof s.security_focus !== 'string' || !s.security_focus) problems.push(`${s.id}: a security scenario needs a security_focus`);
    }
  }
  return problems;
}

export const sanitize = (text) => text.replace(/cheffy|hidkit/gi, 'assistant');

// The judge sees the security focus of the scenario, so the security_report claim is per scenario.
export function judgeInput({ judgePrompt, scenario, patch, reply, commands, maxPatchChars }) {
  return [judgePrompt,
    ...(scenario.security ? ['## Security focus', scenario.security_focus] : []),
    '## Task', scenario.prompt, '## Diff', sanitize(patch.slice(0, maxPatchChars)),
    '## Final reply', sanitize(reply), '## Commands that ran', sanitize(commands.join('\n'))].join('\n\n');
}

// filter is the --scenario value, or null for a run of the whole split.
// Reward-hack check: a candidate must not reach the graders, the reference patches or the fixtures in the repo.
// It scans every string in every tool_use input, subagent ones included. It returns the matched strings.
const ANSWER_MARKERS = [/eval\/graders/, /eval\/v2\/graders/, /eval\/v2\/references/, /eval\/v3\/graders/, /eval\/v3\/references/, /eval\/fixtures/, /eval\/v2\/fixtures/, /eval\/v3\/fixtures/, /correct\.patch/, /shallow[^/\s]*\.patch/];
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function answerAccess(events, repoRoot) {
  const root = new RegExp(`${escapeRegExp(repoRoot.replace(/\/+$/, ''))}(?![\\w.-])`);
  const strings = (value) => (typeof value === 'string' ? [value]
    : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : []);
  const hits = events.flatMap((e) => (e.message?.content ?? []).filter((c) => c.type === 'tool_use').flatMap((c) => strings(c.input)))
    .filter((text) => root.test(text) || ANSWER_MARKERS.some((m) => m.test(text)));
  return [...new Set(hits)];
}

export function buildMeta({ set, split, filter, scenarios, arms, repeats, sandbox = false }) {
  return { set, split, filter, scenarios: scenarios.map((s) => s.id), arms, repeats, sandbox, node: process.version };
}

const ENV_KEYS = ['PATH', 'HOME', 'TMPDIR', 'LANG', 'USER', 'SHELL', 'TERM'];

// The child env is an allowlist, so no API key or other secret reaches a model run.
export function buildEnv(source, configDir, home = source.HOME ?? '') {
  const env = {};
  for (const key of ENV_KEYS) if (typeof source[key] === 'string') env[key] = source[key];
  const local = path.join(home, '.local/bin');
  const parts = (env.PATH ?? '').split(path.delimiter).filter(Boolean);
  if (home && !parts.includes(local)) parts.push(local);
  env.PATH = parts.join(path.delimiter);
  env.CLAUDE_CONFIG_DIR = configDir;
  return env;
}

// Same-model rule: every model in modelUsage is the candidate model. Haiku is allowed as Claude Code background use.
export function checkModels(modelUsage, candidate) {
  const keys = Object.keys(modelUsage ?? {});
  if (keys.length === 0) throw new Error('result has no modelUsage, so the model cannot be verified');
  const want = candidate.toLowerCase();
  const background = [];
  const foreign = [];
  for (const key of keys) {
    const k = key.toLowerCase();
    if (k.includes(want)) continue;
    if (/haiku/.test(k)) background.push(key);
    else foreign.push(key);
  }
  if (foreign.length) throw new Error(`models other than ${candidate} were used: ${foreign.join(', ')}`);
  return { background_models: background };
}

export function checkApiKeySource(init) {
  if (init && init.apiKeySource !== 'none') {
    throw new Error(`init apiKeySource is ${JSON.stringify(init.apiKeySource)}, not "none": the run may bill the API`);
  }
}

// Returns a list of problems. An empty list means the results are complete.
// expectedIds lists the scenario ids of the set and split in meta. A run that skipped one of them is incomplete.
export function checkCompleteness(records, meta, hasErrorLog, expectedIds = null) {
  const problems = [];
  if (hasErrorLog) problems.push('harness-errors.log exists');
  const skipped = (expectedIds ?? []).filter((id) => !(meta?.scenarios ?? []).includes(id));
  if (skipped.length && meta?.filter) problems.push(`partial run (--scenario ${meta.filter}): not a complete split`);
  else for (const id of skipped) problems.push(`scenario ${id} of set ${meta?.set ?? 'v1'} split ${meta?.split ?? 'all'} did not run`);
  const scenarios = meta?.scenarios ?? [...new Set(records.map((r) => r.scenario))];
  const arms = meta?.arms ?? [...new Set(records.map((r) => r.arm))];
  const counts = scenarios.flatMap((s) => arms.map((a) => [s, a, records.filter((r) => r.scenario === s && r.arm === a).length]));
  const expected = meta?.repeats ?? Math.max(0, ...counts.map(([, , n]) => n));
  for (const [s, a, n] of counts) {
    if (n === 0) problems.push(`scenario ${s} lacks arm ${a}`);
    else if (n !== expected) problems.push(`${s}/${a} has ${n} runs, expected ${expected}`);
  }
  if (arms.length < 2 || !arms.includes('baseline') || !arms.includes('cheffy')) problems.push('both arms are required');
  return problems;
}

// Names of tests in TAP output, split by result. File-level entries (a load failure) are not assertions.
export function tapResults(tap) {
  const failed = new Set();
  const passed = new Set();
  for (const line of tap.split('\n')) {
    const m = /^\s*(not ok|ok) \d+ - (.*?)(?:\s+#.*)?$/.exec(line);
    if (!m || /\.test\.[cm]?[jt]s$/.test(m[2])) continue;
    (m[1] === 'ok' ? passed : failed).add(m[2]);
  }
  return { failed, passed };
}

// Repro: at least one test fails before the fix as a real test and passes after it.
export function reproVerdict(beforeTap, afterTap) {
  const before = tapResults(beforeTap);
  const after = tapResults(afterTap);
  return [...before.failed].some((name) => after.passed.has(name)) && after.failed.size === 0;
}

// Only the harness denial text means the command never ran. A command that failed with EACCES still ran.
const HARNESS_DENIAL = /Permission to use \S+ has been denied/;
const resultText = (content) => (typeof content === 'string' ? content : (content ?? []).map((c) => c.text ?? '').join('\n'));

// Commands that really ran: a shell tool use with a matching result that is not a permission denial.
// Subagent tool uses (parent_tool_use_id set) follow the same rule. A failing command still ran.
export function executedCommands(events) {
  const results = new Map();
  for (const e of events) {
    for (const c of e.message?.content ?? []) if (c.type === 'tool_result') results.set(c.tool_use_id, c);
  }
  return events.flatMap((e) => (e.message?.content ?? [])
    .filter((c) => c.type === 'tool_use' && typeof c.input?.command === 'string')
    .filter((c) => {
      const result = results.get(c.id);
      return result && !(result.is_error && HARNESS_DENIAL.test(resultText(result.content)));
    })
    .map((c) => c.input.command));
}

// The judge gets a new empty dir outside the eval root, so it cannot read candidate work dirs or ledgers.
export const freshJudgeDir = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mini-eval-judge-')));
