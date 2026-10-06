import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PLUGIN_ENTRIES, answerAccess, buildMeta, checkCompleteness, checkScenarios, judgeInput, parseOptions, selectScenarios, setDir,
} from '../eval/lib/harness.mjs';
import { runGrader } from '../eval/lib/grader.mjs';

const EVAL_DIR = fileURLToPath(new URL('../eval/', import.meta.url));
const load = (rel) => JSON.parse(fs.readFileSync(path.join(EVAL_DIR, rel), 'utf8'));

test('options default to set v1 and split all, and reject unknown values', () => {
  assert.deepEqual(parseOptions([]), { set: 'v1', split: 'all', scenario: null, arms: ['baseline', 'cheffy'], repeats: null, judge: true, judgeOnly: null, judgeRepeats: null });
  const o = parseOptions(['--set', 'v2', '--split', 'train', '--scenario', 'csv-commas', '--arms', 'baseline', '--repeats', '2', '--no-judge']);
  assert.deepEqual(o, { set: 'v2', split: 'train', scenario: 'csv-commas', arms: ['baseline'], repeats: 2, judge: false, judgeOnly: null, judgeRepeats: null });
  assert.equal(parseOptions(['--set', 'v2', '--judge-only', 'eval/results/x', '--judge-repeats', '1']).judgeRepeats, 1);
  assert.throws(() => parseOptions(['--set', 'v4']), /set/);
  assert.equal(parseOptions(['--set', 'v3']).set, 'v3');
  assert.throws(() => parseOptions(['--split', 'dev']), /split/);
  assert.throws(() => parseOptions(['--arms', 'baseline,other']), /arm/);
});

test('each set has its own directory', () => {
  assert.equal(setDir('/e', 'v1'), '/e');
  assert.equal(setDir('/e', 'v2'), path.join('/e', 'v2'));
  assert.equal(setDir('/e', 'v3'), path.join('/e', 'v3'));
});

test('scenario selection filters by split and by id', () => {
  const all = [{ id: 'a', split: 'train' }, { id: 'b', split: 'test' }, { id: 'c', split: 'train' }];
  assert.deepEqual(selectScenarios(all, { split: 'all' }).map((s) => s.id), ['a', 'b', 'c']);
  assert.deepEqual(selectScenarios(all, { split: 'train' }).map((s) => s.id), ['a', 'c']);
  assert.deepEqual(selectScenarios(all, { split: 'train', scenario: 'c' }).map((s) => s.id), ['c']);
  assert.throws(() => selectScenarios(all, { split: 'test', scenario: 'a' }), /no scenario/);
  assert.throws(() => selectScenarios([{ id: 'x' }], { split: 'train' }), /no scenario/);
});

test('split all leaves out a retired scenario, and split retired selects it', () => {
  const all = [{ id: 'a', split: 'train' }, { id: 'r', split: 'retired' }, { id: 'b', split: 'test' }];
  assert.deepEqual(selectScenarios(all, { split: 'all' }).map((s) => s.id), ['a', 'b']);
  assert.deepEqual(selectScenarios(all, { split: 'retired' }).map((s) => s.id), ['r']);
  assert.deepEqual(selectScenarios(all, { split: 'all', scenario: 'a' }).map((s) => s.id), ['a']);
  assert.throws(() => selectScenarios(all, { split: 'all', scenario: 'r' }), /no scenario/);
  assert.equal(parseOptions(['--split', 'retired']).split, 'retired');
  assert.deepEqual(checkScenarios([{ id: 'r', project: 'p', fixture: 'p', prompt: 'x', split: 'retired', graders: { hidden: 'r.test.mjs' } }], 'v3'), []);
});

test('scenario check needs a split in v2, and an injection grader and a focus for security', () => {
  const ok = { id: 'a', project: 'p', fixture: 'p', prompt: 'x', repro: false, split: 'train', graders: { hidden: 'a.test.mjs' } };
  assert.deepEqual(checkScenarios([ok], 'v2'), []);
  assert.deepEqual(checkScenarios([ok], 'v3'), []);
  assert.match(checkScenarios([{ ...ok, split: undefined }], 'v3')[0], /split/);
  assert.match(checkScenarios([{ ...ok, split: undefined }], 'v2')[0], /split/);
  assert.deepEqual(checkScenarios([{ ...ok, split: undefined }], 'v1'), []);
  const sec = checkScenarios([{ ...ok, security: true }], 'v2');
  assert.ok(sec.some((p) => /injection/.test(p)) && sec.some((p) => /security_focus/.test(p)));
  assert.match(checkScenarios([ok, ok], 'v2')[0], /duplicate/);
  assert.match(checkScenarios([{ ...ok, graders: {} }], 'v2')[0], /hidden/);
});

test('the scenario files of every set pass the check, and their files exist', () => {
  for (const set of ['v1', 'v2', 'v3']) {
    const dir = setDir(EVAL_DIR, set);
    const scenarios = load(path.relative(EVAL_DIR, path.join(dir, 'scenarios.json')));
    assert.deepEqual(checkScenarios(scenarios, set), [], set);
    for (const s of scenarios) {
      assert.ok(fs.existsSync(path.join(dir, 'fixtures', s.fixture)), `${set} fixture ${s.fixture}`);
      for (const file of Object.values(s.graders)) assert.ok(fs.existsSync(path.join(dir, 'graders', file)), `${set} grader ${file}`);
      if (set !== 'v1') assert.ok(fs.existsSync(path.join(dir, 'references', s.id, 'correct.patch')), `${s.id} correct.patch`);
      if (set === 'v3') assert.ok(fs.readdirSync(path.join(dir, 'references', s.id)).filter((f) => /^shallow.*\.patch$/.test(f)).length >= 2, `${s.id} has two shallow patches`);
    }
  }
});

test('the plugin copy holds no eval file', () => {
  assert.ok(!PLUGIN_ENTRIES.some((e) => e === 'eval' || e.startsWith('eval/')));
  assert.deepEqual(PLUGIN_ENTRIES, ['.claude-plugin', 'skills', 'agents', 'GLOSSARY.md', 'NOTICE']);
});

test('the judge input names the security focus of the scenario only when it has one', () => {
  const base = { prompt: 'Do it.' };
  const plain = judgeInput({ judgePrompt: 'P', scenario: base, patch: 'diff', reply: 'Cheffy did it', commands: ['node --test'], maxPatchChars: 100 });
  assert.ok(!plain.includes('## Security focus'));
  assert.ok(plain.includes('assistant did it'));
  const sec = judgeInput({ judgePrompt: 'P', scenario: { ...base, security: true, security_focus: 'Path traversal in the name.' }, patch: 'x'.repeat(50), reply: '', commands: [], maxPatchChars: 10 });
  assert.match(sec, /## Security focus\n\nPath traversal in the name\./);
  assert.ok(!sec.includes('x'.repeat(11)));
});

test('meta records the set, the split and the node version', () => {
  const meta = buildMeta({ set: 'v2', split: 'train', filter: null, scenarios: [{ id: 'a' }], arms: ['baseline', 'cheffy'], repeats: 3 });
  assert.deepEqual(meta, { set: 'v2', split: 'train', filter: null, scenarios: ['a'], arms: ['baseline', 'cheffy'], repeats: 3, sandbox: false, node: process.version });
});

test('completeness flags a scenario of the split that did not run', () => {
  const rec = (scenario, arm) => ({ scenario, arm });
  const meta = { set: 'v2', split: 'train', scenarios: ['a'], arms: ['baseline', 'cheffy'], repeats: 1 };
  const records = [rec('a', 'baseline'), rec('a', 'cheffy')];
  assert.deepEqual(checkCompleteness(records, meta, false, ['a']), []);
  assert.deepEqual(checkCompleteness(records, meta, false), []);
  const problems = checkCompleteness(records, meta, false, ['a', 'b']);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /b.*v2.*train/);
  // A run filtered with --scenario says so once, instead of listing each scenario it skipped.
  const partial = checkCompleteness(records, { ...meta, filter: 'a' }, false, ['a', 'b', 'c']);
  assert.deepEqual(partial.length, 1);
  assert.match(partial[0], /partial run.*--scenario a/);
});

test('a grader that hangs counts as a failure, not as a harness error', { timeout: 30_000 }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grader-test-'));
  try {
    const grader = path.join(dir, 'hang.test.mjs');
    fs.writeFileSync(grader, "import { test } from 'node:test';\ntest('hang', { timeout: 100 }, () => { for (;;) {} });\n");
    const res = runGrader(grader, { evalDir: EVAL_DIR, candidateDir: '/cand', timeoutMs: 1_500 });
    assert.equal(res.passed, false);
    assert.equal(res.timedOut, true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a grader runs from eval/ with the candidate dir in its env', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grader-test-'));
  try {
    const grader = path.join(dir, 'probe.test.mjs');
    fs.writeFileSync(grader, [
      "import { test } from 'node:test';",
      "import assert from 'node:assert/strict';",
      "test('env', { timeout: 5000 }, () => {",
      `  assert.equal(process.cwd(), ${JSON.stringify(path.resolve(EVAL_DIR))});`,
      "  assert.equal(process.env.CANDIDATE_DIR, '/cand');",
      "  assert.equal(process.env.BASE_REF, 'abc');",
      '});',
      "test('second', { timeout: 5000 }, () => { assert.equal(process.env.BASE_REF, 'abc'); });",
    ].join('\n'));
    const ok = runGrader(grader, { evalDir: EVAL_DIR, candidateDir: '/cand', baseRef: 'abc' });
    assert.equal(ok.passed, true);
    assert.deepEqual([...ok.results.passed].sort(), ['env', 'second']);
    const bad = runGrader(grader, { evalDir: EVAL_DIR, candidateDir: '/other', baseRef: 'abc' });
    assert.equal(bad.passed, false);
    assert.deepEqual([...bad.results.failed], ['env']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the answer scan flags repo, grader, reference and fixture paths in any tool use', () => {
  const repo = '/Users/me/hidkit';
  const work = '/private/var/folders/x/T/mini-eval-abc/work-1/activity-feed';
  const use = (input, parent = null) => ({ parent_tool_use_id: parent, message: { content: [{ type: 'tool_use', id: 'u', name: 'X', input }] } });
  const scan = (events) => answerAccess(events, repo);
  // The candidate's own workdir, its tests, and a sibling folder whose name starts with the repo name are clean.
  assert.deepEqual(scan([
    use({ file_path: `${work}/src/feed.mjs` }), use({ command: `cd ${work} && node --test test/feed.test.mjs` }),
    use({ pattern: 'createdAt', path: work }), use({ command: 'git diff' }), use({ file_path: '/Users/me/hidkit-notes/a.md' }),
    { type: 'result', result: `${repo}/eval/v2/references` },
  ]), []);
  assert.deepEqual(scan([use({ file_path: `${repo}/README.md` })]), [`${repo}/README.md`]);
  assert.deepEqual(scan([use({ command: `cat ${repo}` })]), [`cat ${repo}`]);
  assert.deepEqual(scan([use({ pattern: '**/eval/v2/graders/*.mjs' }, 'parent-1')]), ['**/eval/v2/graders/*.mjs']);
  for (const hit of ['../../eval/graders/x.mjs', 'eval/v2/references/feed-gaps', 'eval/v3/references/rate-limit-keys', 'cat eval/v3/graders/x.mjs', 'find / -name eval/fixtures', 'ls eval/v2/fixtures', 'ls eval/v3/fixtures']) {
    assert.deepEqual(scan([use({ command: hit })]), [hit], hit);
  }
  assert.deepEqual(scan([use({ path: '/tmp', pattern: 'correct.patch' })]), ['correct.patch']);
  assert.deepEqual(scan([use({ command: 'find / -name shallow.patch' })]), ['find / -name shallow.patch']);
  // Nested input values are scanned too, and each match is listed once.
  assert.deepEqual(scan([use({ edits: [{ file_path: `${repo}/x` }] }), use({ file_path: `${repo}/x` })]), [`${repo}/x`]);
});

test('both arms run Bash in a strict sandbox that cannot read the repo', () => {
  const config = JSON.parse(fs.readFileSync(path.join(EVAL_DIR, 'config.json'), 'utf8'));
  const { sandbox } = config.candidate_settings;
  assert.deepEqual([sandbox.enabled, sandbox.autoAllowBashIfSandboxed, sandbox.allowUnsandboxedCommands, sandbox.failIfUnavailable], [true, true, false, true]);
  // Network only for the scanners that gate 11 runs: semgrep rules and the OSV database.
  assert.deepEqual(sandbox.network, { strictAllowlist: true, allowedDomains: ['semgrep.dev', '*.semgrep.dev', 'api.osv.dev'] });
  assert.ok(sandbox.filesystem.denyRead.includes('{repo}'));
  // The file tools run outside the sandbox: deny rules keep them out of the home tree and the repo.
  assert.deepEqual(config.candidate_settings.permissions.deny, ['Edit(//Users/**)', 'Write(//Users/**)', 'Read(/{repo}/**)']);
  for (const arm of ['baseline', 'cheffy']) assert.ok(!config.isolation[arm].includes('--settings'), `${arm} must take its settings from candidate_settings`);
});
