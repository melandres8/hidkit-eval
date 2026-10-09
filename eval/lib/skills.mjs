// Helpers for eval/skills/run.mjs. No model calls and no process spawning.
import fs from 'node:fs';
import path from 'node:path';
import { PLUGIN_ENTRIES } from './harness.mjs';

export const SKILL_ARMS = ['with_skill', 'without_skill'];

// An expectation of this form is graded from the diff, not by the judge.
const PATH_RULE = /^No file under (\S+?) changed\.?$/;

export function parseSkillOptions(argv) {
  const arg = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? null : argv[i + 1];
  };
  const skill = arg('skill');
  if (!skill || !/^[a-z0-9][a-z0-9-]*$/.test(skill)) throw new Error('--skill <name> is required');
  const arms = (arg('arms') ?? SKILL_ARMS.join(',')).split(',');
  const bad = arms.filter((a) => !SKILL_ARMS.includes(a));
  if (bad.length) throw new Error(`unknown arm ${bad.join(', ')}: use ${SKILL_ARMS.join(' or ')}`);
  const num = (name, fallback) => {
    const v = arg(name);
    if (v === null) return fallback;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) throw new Error(`--${name} must be a positive integer`);
    return n;
  };
  return {
    skill, arms, repeats: num('repeats', 1), judgeRepeats: num('judge-repeats', 1),
    evalId: arg('eval') === null ? null : Number(arg('eval')), dryRun: argv.includes('--dry-run'),
  };
}

// Splits the expectations of one case into the ones that the diff grades and the ones that the judge grades.
export function splitExpectations(expectations) {
  const paths = [];
  const judged = [];
  for (const text of expectations) {
    const m = PATH_RULE.exec(text.trim());
    if (m) paths.push({ text, dir: m[1].replace(/\/+$/, '') });
    else judged.push(text);
  }
  return { paths, judged };
}

export function gradePaths(rules, changed) {
  return rules.map(({ text, dir }) => {
    const hits = changed.filter((f) => f === dir || f.startsWith(`${dir}/`));
    return { text, passed: hits.length === 0, evidence: hits.length ? `changed: ${hits.join(', ')}` : `git diff shows no change under ${dir}` };
  });
}

// The run dir is the cwd and the plugin dir of the candidate, so a git diff there sees every edit to the skills.
// The without_skill arm gets the same plugin without the skill under measurement. Eval dirs never reach a candidate.
export function stageRunDir({ hidkit, dest, skill, arm, files, setDir }) {
  for (const name of PLUGIN_ENTRIES) {
    fs.cpSync(path.join(hidkit, name), path.join(dest, name), {
      recursive: true,
      filter: (src) => !/(^|\/)skills\/[^/]+\/evals(\/|$)/.test(path.relative(hidkit, src)),
    });
  }
  if (arm === 'without_skill') fs.rmSync(path.join(dest, 'skills', skill), { recursive: true, force: true });
  fs.mkdirSync(path.join(dest, 'transcripts'), { recursive: true });
  for (const f of files) fs.copyFileSync(path.join(setDir, f), path.join(dest, 'transcripts', path.basename(f)));
}

// Files that an Edit, Write, or NotebookEdit call targeted inside the work dir, denied calls included.
// A denied edit still shows that the candidate did not wait for approval.
export function attemptedEdits(events, dir) {
  return [...new Set(events.flatMap((e) => (Array.isArray(e.message?.content) ? e.message.content : []))
    .filter((c) => c.type === 'tool_use' && ['Edit', 'Write', 'NotebookEdit'].includes(c.name))
    .map((c) => c.input?.file_path ?? c.input?.notebook_path)
    .filter((f) => typeof f === 'string' && path.isAbsolute(f) && !path.relative(dir, f).startsWith('..'))
    .map((f) => path.relative(dir, f)))];
}

export const candidatePrompt = (skill, arm, prompt) => (arm === 'with_skill' ? `/hidkit:${skill} ${prompt}` : prompt);

// The with_skill arm must load the skill and the without_skill arm must not.
export function skillIsolation(init, skill, arm, forbidden) {
  const name = `hidkit:${skill}`;
  const skills = init?.skills ?? [];
  const text = JSON.stringify(init ?? {}).toLowerCase();
  const problems = forbidden.filter((m) => text.includes(m)).map((m) => `leaked ${m}`);
  if (!init) problems.push('no init event');
  if (!skills.some((s) => s.startsWith('hidkit:'))) problems.push('the hidkit plugin did not load');
  if (arm === 'with_skill' && !skills.includes(name)) problems.push(`${name} did not load`);
  if (arm === 'without_skill' && skills.includes(name)) problems.push(`${name} loaded in the without_skill arm`);
  return problems;
}

export const sanitizeSkill = (text, skill) => text.replace(new RegExp(`cheffy|hidkit|${skill}`, 'gi'), 'assistant');

export function skillJudgeInput({ judgePrompt, testCase, transcripts, reply, patch, judged, skill, maxPatchChars }) {
  return [judgePrompt,
    '## Request', sanitizeSkill(testCase.prompt, skill),
    ...transcripts.flatMap((t) => [`## Transcript ${t.name}`, t.text]),
    '## Description of a good output', testCase.expected_output,
    '## Final reply', sanitizeSkill(reply, skill),
    '## Diff', sanitizeSkill(patch.slice(0, maxPatchChars), skill) || '(no change)',
    '## Expectations', judged.map((t, i) => `${i + 1}. ${t}`).join('\n')].join('\n\n');
}

// A judge verdict is usable only when it grades each expectation, in order, with the text unchanged.
export function checkVerdict(verdict, judged) {
  const got = verdict?.expectations;
  if (!Array.isArray(got) || got.length !== judged.length) return `the judge graded ${got?.length ?? 0} of ${judged.length} expectations`;
  const moved = got.findIndex((e, i) => e.text.trim() !== judged[i].trim());
  return moved === -1 ? null : `the judge changed expectation ${moved + 1}`;
}

// With several judges, an expectation passes only when every judge passes it.
export function mergeJudges(judged, verdicts) {
  return judged.map((text, i) => ({
    text,
    passed: verdicts.every((v) => v.expectations[i].passed === true),
    evidence: verdicts.map((v) => v.expectations[i].evidence).join(' | '),
  }));
}

// Pass rate per case and arm, in the shape that a reader scans: one line per case.
export function summarize(records) {
  const rows = new Map();
  for (const r of records) {
    const key = `${r.eval_id}\t${r.arm}`;
    const row = rows.get(key) ?? { eval_id: r.eval_id, eval_name: r.eval_name, arm: r.arm, passed: 0, total: 0, runs: 0, cost_usd: 0 };
    row.passed += r.summary.passed;
    row.total += r.summary.total;
    row.runs += 1;
    row.cost_usd += r.cost_usd ?? 0;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => a.eval_id - b.eval_id || a.arm.localeCompare(b.arm))
    .map((row) => ({ ...row, pass_rate: row.total ? row.passed / row.total : null }));
}
