import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  attemptedEdits, candidatePrompt, candidateSettings, candidateTools, checkVerdict, gradePaths, mergeJudges, parseSkillOptions, skillIsolation, skillJudgeInput, splitExpectations, stageRunDir, summarize,
} from '../eval/lib/skills.mjs';

test('options need a skill and accept only known arms and positive counts', () => {
  assert.deepEqual(parseSkillOptions(['--skill', 'sharpener']), { skill: 'sharpener', arms: ['with_skill', 'without_skill'], repeats: 1, judgeRepeats: 1, evalId: null, dryRun: false });
  assert.equal(parseSkillOptions(['--skill', 'sharpener', '--eval', '2', '--dry-run']).evalId, 2);
  assert.throws(() => parseSkillOptions([]), /--skill/);
  assert.throws(() => parseSkillOptions(['--skill', 'x', '--arms', 'cheffy']), /unknown arm/);
  assert.throws(() => parseSkillOptions(['--skill', 'x', '--repeats', '0']), /positive/);
});

test('path expectations go to the diff and the rest to the judge', () => {
  const { paths, judged } = splitExpectations(['No file under skills/doodle changed.', 'The output asks for approval.']);
  assert.deepEqual(paths, [{ text: 'No file under skills/doodle changed.', dir: 'skills/doodle' }]);
  assert.deepEqual(judged, ['The output asks for approval.']);
  const graded = gradePaths(paths, ['skills/doodle/SKILL.md', 'skills/doodle-extra/x']);
  assert.equal(graded[0].passed, false);
  assert.match(graded[0].evidence, /skills\/doodle\/SKILL\.md/);
  assert.doesNotMatch(graded[0].evidence, /doodle-extra/);
  assert.equal(gradePaths(paths, ['skills/doodle-extra/x'])[0].passed, true);
});

test('the run dir holds the plugin without eval dirs, and the without_skill arm drops the skill', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-test-'));
  const hidkit = path.join(tmp, 'hidkit');
  for (const f of ['.claude-plugin/plugin.json', 'skills/a/SKILL.md', 'skills/a/evals/evals.json', 'skills/b/SKILL.md', 'agents/x.md', 'GLOSSARY.md', 'NOTICE']) {
    fs.mkdirSync(path.dirname(path.join(hidkit, f)), { recursive: true });
    fs.writeFileSync(path.join(hidkit, f), 'x');
  }
  const set = path.join(tmp, 'set');
  fs.mkdirSync(path.join(set, 'files'), { recursive: true });
  fs.writeFileSync(path.join(set, 'files', 's.txt'), 'session');
  const stage = (arm) => {
    const dest = path.join(tmp, arm);
    stageRunDir({ hidkit, dest, skill: 'a', arm, files: ['files/s.txt'], setDir: set });
    return dest;
  };
  const withDir = stage('with_skill');
  assert.ok(fs.existsSync(path.join(withDir, 'skills/a/SKILL.md')));
  assert.ok(!fs.existsSync(path.join(withDir, 'skills/a/evals')));
  assert.equal(fs.readFileSync(path.join(withDir, 'transcripts/s.txt'), 'utf8'), 'session');
  const withoutDir = stage('without_skill');
  assert.deepEqual(fs.readdirSync(path.join(withoutDir, 'skills')), ['b']);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('only the with_skill arm invokes the skill', () => {
  assert.equal(candidatePrompt('sharpener', 'with_skill', 'go'), '/hidkit:sharpener go');
  assert.equal(candidatePrompt('sharpener', 'without_skill', 'go'), 'go');
});

test('isolation checks that the skill loads only in its arm', () => {
  const init = (skills) => ({ skills, plugins: [{ name: 'hidkit' }] });
  assert.deepEqual(skillIsolation(init(['hidkit:sharpener', 'hidkit:doodle']), 'sharpener', 'with_skill', ['caveman']), []);
  assert.deepEqual(skillIsolation(init(['hidkit:doodle']), 'sharpener', 'with_skill', []), ['hidkit:sharpener did not load']);
  assert.deepEqual(skillIsolation(init(['hidkit:sharpener', 'hidkit:doodle']), 'sharpener', 'without_skill', []), ['hidkit:sharpener loaded in the without_skill arm']);
  assert.deepEqual(skillIsolation(init(['hidkit:doodle', 'caveman']), 'sharpener', 'without_skill', ['caveman']), ['leaked caveman']);
  assert.deepEqual(skillIsolation(null, 'sharpener', 'without_skill', []), ['no init event', 'the hidkit plugin did not load']);
});

test('the judge input hides the skill name and lists the judged expectations', () => {
  const input = skillJudgeInput({ judgePrompt: 'P', testCase: { prompt: 'use sharpener', expected_output: 'E' }, transcripts: [{ name: 't.txt', text: 'T' }],
    reply: 'Sharpener says hi', patch: '', judged: ['a', 'b'], skill: 'sharpener', maxPatchChars: 10 });
  assert.doesNotMatch(input, /sharpener/i);
  assert.match(input, /## Diff\n\n\(no change\)/);
  assert.match(input, /1\. a\n2\. b/);
});

test('a verdict must grade each expectation in order, and all judges must pass one', () => {
  const v = (passed) => ({ expectations: [{ text: 'a', passed, evidence: 'e' }] });
  assert.equal(checkVerdict(v(true), ['a']), null);
  assert.match(checkVerdict(v(true), ['a', 'b']), /1 of 2/);
  assert.match(checkVerdict(v(true), ['z']), /changed expectation 1/);
  assert.deepEqual(mergeJudges(['a'], [v(true), v(false)]), [{ text: 'a', passed: false, evidence: 'e | e' }]);
});

test('the summary gives a pass rate per case and arm', () => {
  const r = (id, arm, passed, total) => ({ eval_id: id, eval_name: `eval-${id}`, arm, summary: { passed, total }, cost_usd: 1 });
  const rows = summarize([r(2, 'with_skill', 1, 2), r(1, 'without_skill', 0, 2), r(1, 'with_skill', 2, 2), r(1, 'with_skill', 1, 2)]);
  assert.deepEqual(rows.map((x) => [x.eval_id, x.arm, x.pass_rate, x.runs]), [[1, 'with_skill', 0.75, 2], [1, 'without_skill', 0, 1], [2, 'with_skill', 0.5, 1]]);
});

test('attempted edits count each edit call inside the work dir, denied or not', () => {
  const use = (name, input) => ({ message: { content: [{ type: 'tool_use', name, input }] } });
  const events = [use('Edit', { file_path: '/w/skills/doodle/SKILL.md' }), use('Write', { file_path: '/w/skills/doodle/SKILL.md' }),
    use('Write', { file_path: '/tmp/x.md' }), use('Read', { file_path: '/w/a.md' }), { message: { content: 'text' } }];
  assert.deepEqual(attemptedEdits(events, '/w'), ['skills/doodle/SKILL.md']);
});

test('edit and write are scoped to the work dir, and the denied dirs reach both deny lists', () => {
  assert.deepEqual(candidateTools(['Read', 'Edit', 'Bash(git *)', 'Bash(node *)'], '/tmp/w'), ['Read', 'Edit(//tmp/w/**)', 'Bash', 'Skill']);
  const base = { permissions: { deny: ['Read(/{repo}/**)'] }, sandbox: { filesystem: { denyRead: ['{repo}'] } } };
  const s = candidateSettings(base, ['/r', '/h', '/r']);
  assert.deepEqual(s.permissions.deny, ['Read(//r/**)', 'Read(//h/**)']);
  assert.deepEqual(s.sandbox.filesystem.denyRead, ['/r', '/h']);
});
