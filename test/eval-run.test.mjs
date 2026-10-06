import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildEnv, checkApiKeySource, checkCompleteness, checkModels, executedCommands, freshJudgeDir, reproVerdict } from '../eval/lib/harness.mjs';

test('env builder keeps only the allowlist and adds the config dir', () => {
  const env = buildEnv({ PATH: '/usr/bin', HOME: '/h', ANTHROPIC_API_KEY: 'k', AWS_SECRET: 's', TERM: 'x' }, '/cfg', '/h');
  assert.deepEqual(Object.keys(env).sort(), ['CLAUDE_CONFIG_DIR', 'HOME', 'PATH', 'TERM']);
  assert.equal(env.PATH, '/usr/bin:/h/.local/bin');
  assert.equal(env.CLAUDE_CONFIG_DIR, '/cfg');
});

test('model check allows the candidate and haiku, and rejects others', () => {
  assert.deepEqual(checkModels({ 'claude-sonnet-5-5': {}, 'claude-haiku-4-5': {} }, 'sonnet'), { background_models: ['claude-haiku-4-5'] });
  assert.throws(() => checkModels({ 'claude-sonnet-5-5': {}, 'claude-opus-5': {} }, 'sonnet'), /opus/);
  assert.throws(() => checkModels(undefined, 'sonnet'), /modelUsage/);
});

test('api key source must be none', () => {
  checkApiKeySource({ apiKeySource: 'none' });
  checkApiKeySource(null);
  assert.throws(() => checkApiKeySource({ apiKeySource: 'ANTHROPIC_API_KEY' }), /apiKeySource/);
});

test('completeness flags errors, missing arms, and wrong repeat counts', () => {
  const rec = (scenario, arm) => ({ scenario, arm });
  const meta = { scenarios: ['a', 'b'], arms: ['baseline', 'cheffy'], repeats: 2 };
  const full = ['a', 'b'].flatMap((s) => ['baseline', 'cheffy'].flatMap((a) => [rec(s, a), rec(s, a)]));
  assert.deepEqual(checkCompleteness(full, meta, false), []);
  assert.equal(checkCompleteness(full, meta, true).length, 1);
  assert.match(checkCompleteness(full.filter((r) => !(r.scenario === 'b' && r.arm === 'cheffy')), meta, false)[0], /lacks arm/);
  assert.match(checkCompleteness(full.slice(1), meta, false)[0], /expected 2/);
});

test('repro needs a real test that fails before and passes after', () => {
  const failing = 'not ok 1 - splits evenly\n';
  const loadFail = 'not ok 1 - /tmp/x/test/new.test.mjs\n';
  const passing = 'ok 1 - splits evenly\n';
  assert.equal(reproVerdict(failing, passing), true);
  assert.equal(reproVerdict(loadFail, passing), false);
  assert.equal(reproVerdict(passing, passing), false);
});

test('command list drops denied tool uses and keeps failing ones', () => {
  const use = (id, command, parent = null) => ({ parent_tool_use_id: parent, message: { content: [{ type: 'tool_use', id, name: 'Bash', input: { command } }] } });
  const res = (id, text, is_error = false) => ({ message: { content: [{ type: 'tool_result', tool_use_id: id, is_error, content: text }] } });
  const events = [
    use('1', 'node a'), res('1', 'ok'),
    use('2', 'node b'), res('2', 'Exit code 1\nfail', true),
    use('3', 'rm x'), res('3', "Permission to use Bash has been denied because Claude Code is running in don't ask mode.", true),
    use('4', 'git log', 'p1'), res('4', [{ type: 'text', text: 'done' }]),
    use('5', 'git push', 'p1'), res('5', [{ type: 'text', text: 'Permission to use Bash has been denied' }], true),
    use('6', 'never answered'),
    use('7', 'node c'), res('7', "Error: EACCES: permission denied, open '/x'", true),
    use('8', 'cat y'), res('8', 'cat: y: Permission denied', true),
  ];
  assert.deepEqual(executedCommands(events), ['node a', 'node b', 'git log', 'node c', 'cat y']);
});

test('the judge runs in a fresh empty dir of its own', () => {
  const dirs = [freshJudgeDir(), freshJudgeDir()];
  try {
    assert.notEqual(dirs[0], dirs[1]);
    for (const dir of dirs) {
      assert.deepEqual(fs.readdirSync(dir), []);
      assert.equal(path.dirname(dir), fs.realpathSync(os.tmpdir()));
      assert.ok(path.basename(dir).startsWith('mini-eval-judge-'));
    }
  } finally {
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
  }
});
