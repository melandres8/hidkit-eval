// Host-side guards for directories that a candidate could write. The runners use them before they run git
// in a work dir or load a plugin dir, because both can run code on the host, outside the sandbox.
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// fsmonitor and hooks are commands that git runs from the repository config. Replace objects can swap the base.
const GIT_FLAGS = ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null'];
const GIT_ENV = { GIT_CONFIG_NOSYSTEM: '1', GIT_NO_REPLACE_OBJECTS: '1', GIT_TERMINAL_PROMPT: '0' };

export const safeGit = (cwd, ...args) => execFileSync('git', [...GIT_FLAGS, ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...GIT_ENV } }).trim();

// A diff that runs no external diff driver and no textconv command from the repository config.
export const safeDiff = (cwd, ...args) => safeGit(cwd, 'diff', '--no-ext-diff', '--no-textconv', ...args);

export function saveGitState(dir) {
  return { config: fs.readFileSync(path.join(dir, '.git', 'config')) };
}

// Puts back the git config from before the run, removes hooks and attributes that the candidate added, and rebuilds
// the index from the base commit. A clean index also undoes skip-worktree and assume-unchanged flags.
export function restoreGitState(dir, state, base) {
  const gitDir = path.join(dir, '.git');
  const stat = fs.lstatSync(gitDir, { throwIfNoEntry: false });
  if (!stat || !stat.isDirectory()) throw new Error(`${gitDir} is no longer a directory`);
  for (const name of ['config', 'hooks', 'info', 'index']) {
    if (fs.lstatSync(path.join(gitDir, name), { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error(`${gitDir}/${name} is a symlink`);
  }
  fs.writeFileSync(path.join(gitDir, 'config'), state.config);
  fs.rmSync(path.join(gitDir, 'hooks'), { recursive: true, force: true });
  fs.rmSync(path.join(gitDir, 'info', 'attributes'), { force: true });
  fs.rmSync(path.join(gitDir, 'index'), { force: true });
  safeGit(dir, 'read-tree', base);
}

// A directory under the home cache. Candidates cannot write there: the deny rules block Edit and Write on /Users,
// and the Bash sandbox writes only to the work dir and the added dirs. The name has a random part.
export function privateDir(prefix) {
  const cache = path.join(os.homedir(), '.cache');
  fs.mkdirSync(cache, { recursive: true });
  return fs.realpathSync(fs.mkdtempSync(path.join(cache, prefix)));
}

// Maps each path under dir to a hash of its content. A symlink hashes its target text, so the hash never follows it.
export function treeManifest(dir, skip = []) {
  const out = new Map();
  const visit = (rel) => {
    for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (skip.includes(child)) continue;
      const abs = path.join(dir, child);
      if (entry.isSymbolicLink()) out.set(child, `link:${fs.readlinkSync(abs)}`);
      else if (entry.isDirectory()) visit(child);
      else out.set(child, crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex'));
    }
  };
  visit('');
  return out;
}

// Paths that were added, changed, or removed between two manifests, sorted.
export function changedPaths(before, after) {
  const keys = new Set([...before.keys(), ...after.keys()]);
  return [...keys].filter((k) => before.get(k) !== after.get(k)).sort();
}
