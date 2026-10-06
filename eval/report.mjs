#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCompleteness, selectScenarios, setDir } from './lib/harness.mjs';
import { evaluate } from './lib/score.mjs';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node eval/report.mjs <results dir>');
  process.exit(2);
}
const config = JSON.parse(fs.readFileSync(new URL('./config.json', import.meta.url), 'utf8'));
const records = fs.readFileSync(path.join(dir, 'results.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const r = evaluate(records, config);
const metaFile = path.join(dir, 'meta.json');
const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : null;
// Older meta files have no set: they predate v2, so the scenario list of the split is not checked.
let expectedIds = null;
if (meta?.set) {
  const all = JSON.parse(fs.readFileSync(path.join(setDir(path.dirname(fileURLToPath(import.meta.url)), meta.set), 'scenarios.json'), 'utf8'));
  expectedIds = selectScenarios(all, { split: meta.split ?? 'all' }).map((s) => s.id);
}
const problems = checkCompleteness(records, meta, fs.existsSync(path.join(dir, 'harness-errors.log')), expectedIds);
if (!meta) problems.push('meta.json is missing: completeness was inferred from the records only');
const incomplete = problems.filter((p) => !p.startsWith('meta.json'));
const fixed = (n) => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(2) : String(n));
const lines = [
  '# Mini-eval report', '', `Set ${meta?.set ?? 'v1'}, split ${meta?.split ?? 'all'}, node ${meta?.node ?? 'not recorded'}. Runs: ${records.length}.`, '',
  '| Scenario | Baseline | Cheffy | Noise | Cost ratio |', '|---|---|---|---|---|',
  ...r.per_scenario.map((s) => `| ${s.scenario} | ${fixed(s.baseline)} | ${fixed(s.cheffy)} | ${fixed(s.noise)} | ${fixed(s.cost_ratio)} |`),
  '',
  `Quality gain ${fixed(r.quality_gain)} against noise ${fixed(r.noise)}: ${r.quality_ok ? 'pass' : 'fail'}.`,
  `Cost ratio ${fixed(r.cost_ratio)} against ceiling ${config.cost_ceiling}, usage coverage ${r.usage_coverage ? 'complete' : 'incomplete'}: ${r.cost_ok ? 'pass' : 'fail'}.`,
  `Judge agreement ${fixed(r.judge_agreement)} against minimum ${config.min_judge_agreement}: ${r.judge_ok ? 'pass' : 'fail'}.`,
  `Hard failures: ${r.hard_failures.length ? r.hard_failures.join('; ') : 'none'}.`,
  '', 'Both arms ran every role on the candidate model, so role model diversity was off.',
  `Both arms ran under a dedicated CLAUDE_CONFIG_DIR (${config.config_dir}) with no ANTHROPIC_API_KEY. The baseline arm loaded no plugin. The Cheffy arm loaded only Hidkit through --plugin-dir. The forbidden-marker check on each init event checks the isolation.`,
  meta?.sandbox
    ? 'Both arms ran Bash in the OS sandbox with auto-allow, no network and no unsandboxed fallback, so the Bash allowlist did not deny commands.'
    : 'Bash ran without the sandbox: allowlist denials (chained commands, heredocs, rm) can handicap the arm that does not avoid them.',
  'A cost ratio of 0 means the baseline had no accepted run, so the ratio is not meaningful.',
  ...(problems.length ? ['', `Completeness: ${problems.join('; ')}.`] : []),
  '', `Verdict: ${incomplete.length ? 'REJECTED (incomplete)' : r.accepted ? 'ACCEPTED' : 'REJECTED'}.`,
];
fs.writeFileSync(path.join(dir, 'report.md'), `${lines.join('\n')}\n`);
console.log(lines.join('\n'));
process.exitCode = r.accepted && incomplete.length === 0 ? 0 : 1;
