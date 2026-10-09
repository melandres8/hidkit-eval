import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { changedPaths, privateDir, restoreGitState, safeDiff, safeGit, saveGitState, treeManifest } from '../eval/lib/isolation.mjs';

function repo() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'isolation-test-')));
  fs.writeFileSync(path.join(dir, 'a.txt'), 'one\n');
  safeGit(dir, 'init', '-q');
  safeGit(dir, 'add', '-A');
  safeGit(dir, '-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-q', '-m', 'base');
  return { dir, base: safeGit(dir, 'rev-parse', 'HEAD'), state: saveGitState(dir) };
}

test('a git config and hooks that a candidate writes never run on the host', () => {
  const { dir, base, state } = repo();
  const marker = path.join(dir, '..', `${path.basename(dir)}-pwned`);
  const script = path.join(dir, '..', `${path.basename(dir)}-hook.sh`);
  fs.writeFileSync(script, `#!/bin/sh\ntouch ${marker}\n`, { mode: 0o755 });
  fs.appendFileSync(path.join(dir, '.git/config'), `[core]\n\tfsmonitor = ${script}\n[diff]\n\texternal = ${script}\n`);
  fs.mkdirSync(path.join(dir, '.git/hooks'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.git/hooks/pre-commit'), `#!/bin/sh\ntouch ${marker}\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(dir, 'a.txt'), 'two\n');
  restoreGitState(dir, state, base);
  safeGit(dir, 'add', '-A');
  assert.match(safeDiff(dir, '--cached', base), /\+two/);
  assert.equal(fs.existsSync(marker), false);
  fs.rmSync(script);
});

test('an edit hidden with skip-worktree still shows after the restore', () => {
  const { dir, base, state } = repo();
  execFileSync('git', ['update-index', '--skip-worktree', 'a.txt'], { cwd: dir });
  fs.writeFileSync(path.join(dir, 'a.txt'), 'hidden\n');
  restoreGitState(dir, state, base);
  safeGit(dir, 'add', '-A');
  assert.match(safeDiff(dir, '--cached', '--name-only', base), /a\.txt/);
});

test('the restore refuses a .git that is a file or a symlink', () => {
  const { dir, base, state } = repo();
  fs.rmSync(path.join(dir, '.git'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.git'), 'gitdir: /tmp/elsewhere\n');
  assert.throws(() => restoreGitState(dir, state, base), /no longer a directory/);
});

test('the manifest finds added, changed, and removed files, and never follows a symlink', () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-test-')));
  fs.mkdirSync(path.join(dir, 'skills'));
  fs.writeFileSync(path.join(dir, 'skills/a.md'), 'a');
  fs.writeFileSync(path.join(dir, 'b.md'), 'b');
  fs.mkdirSync(path.join(dir, '.git'));
  const before = treeManifest(dir, ['.git']);
  fs.writeFileSync(path.join(dir, 'skills/a.md'), 'changed');
  fs.rmSync(path.join(dir, 'b.md'));
  fs.symlinkSync('/etc/hosts', path.join(dir, 'link'));
  fs.writeFileSync(path.join(dir, '.git/x'), 'ignored');
  const after = treeManifest(dir, ['.git']);
  assert.deepEqual(changedPaths(before, after), ['b.md', 'link', 'skills/a.md']);
  assert.equal(after.get('link'), 'link:/etc/hosts');
});

test('a private dir is under the home cache, with a random name', () => {
  const a = privateDir('isolation-test-');
  const b = privateDir('isolation-test-');
  assert.ok(a.startsWith(fs.realpathSync(os.homedir())));
  assert.notEqual(a, b);
  fs.rmSync(a, { recursive: true });
  fs.rmSync(b, { recursive: true });
});
