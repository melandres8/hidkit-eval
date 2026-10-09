// Host-side guards for directories that a candidate could write. Git config, git attributes, plugin hooks, CLAUDE.md
// files, and test files can each run code or inject text on the host, outside the sandbox of the candidate.
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// fsmonitor and hooks are commands from the repository config. The global and system configs can define filters,
// such as lfs, that a .gitattributes file in the work tree would start. Replace objects can swap the base.
const GIT_FLAGS = ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', '-c', 'core.attributesFile=/dev/null'];
const GIT_ENV = { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_NO_REPLACE_OBJECTS: '1', GIT_TERMINAL_PROMPT: '0' };

export const safeGit = (cwd, ...args) => execFileSync('git', [...GIT_FLAGS, ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...GIT_ENV } }).trim();

// A directory under the home cache. Candidates cannot write there: the deny rules block Edit and Write on /Users,
// and the Bash sandbox writes only to the work dir and the added dirs. The name has a random part.
export function privateDir(prefix) {
  const cache = path.join(os.homedir(), '.cache');
  fs.mkdirSync(cache, { recursive: true });
  return fs.realpathSync(fs.mkdtempSync(path.join(cache, prefix)));
}

// The host never runs git in the .git dir of a candidate, because the candidate controls every file in it: config,
// commondir, alternates, and hooks. The host keeps its own git dir under the home cache, with the work dir as its
// work tree. trackWorkDir runs before the candidate starts, so the base commit holds the clean tree.
export function trackWorkDir(dir) {
  const gitDir = privateDir('hidkit-eval-git-');
  const git = (...args) => safeGit(dir, `--git-dir=${gitDir}`, `--work-tree=${dir}`, ...args);
  git('init', '-q');
  git('add', '-A');
  git('-c', 'user.email=dev@example.com', '-c', 'user.name=dev', 'commit', '-q', '-m', 'base');
  return { gitDir, base: git('rev-parse', 'HEAD') };
}

// The diff of the work dir against the base, staged in the host git dir. No external diff and no textconv run.
export function trackedDiff(dir, { gitDir, base }, ...args) {
  const git = (...more) => safeGit(dir, `--git-dir=${gitDir}`, `--work-tree=${dir}`, ...more);
  git('add', '-A');
  return git('diff', '--no-ext-diff', '--no-textconv', '--cached', base, ...args);
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

// Edit and Write work only inside the work dir. The bare tool names allow a write to any path that no deny rule
// covers, such as a CLAUDE.md in the temp dir, which each later candidate and judge would load.
export const scopeWriteTools = (allowed, dir) => allowed.map((t) => (t === 'Edit' || t === 'Write' ? `${t}(/${dir}/**)` : t));

// Claude Code loads CLAUDE.md files from each parent dir. A candidate that plants one injects text into each later
// run whose cwd is below it. Call this before each candidate and judge run, with the cwd of that run.
const MEMORY_FILES = ['CLAUDE.md', 'CLAUDE.local.md', '.claude'];

export function plantedMemory(dir) {
  const found = [];
  for (let d = path.dirname(dir); ; d = path.dirname(d)) {
    for (const name of MEMORY_FILES) if (fs.existsSync(path.join(d, name))) found.push(path.join(d, name));
    if (d === path.dirname(d)) return found;
  }
}

// Secrets that code under test has no reason to read.
const SECRET_DIRS = ['.ssh', '.aws', '.gnupg', '.config/gh', '.netrc', '.claude', '.claude-eval', '.npmrc', '.docker', '.kube'];
const quote = (p) => JSON.stringify(p);
const real = (p) => {
  try {
    return fs.realpathSync(p);
  } catch {
    return null;
  }
};

// The binaries that code under test may start: node, and git for trace. Any other binary, such as osascript or open,
// could ask a process outside the sandbox to run a command, so the profile denies it.
export function execAllowList(pathVar = process.env.PATH ?? '') {
  const gits = pathVar.split(path.delimiter).filter(Boolean).map((d) => path.join(d, 'git')).filter((p) => fs.existsSync(p));
  let gitCore = null;
  try {
    gitCore = real(execFileSync('git', ['--exec-path'], { encoding: 'utf8', env: { ...process.env, ...GIT_ENV } }).trim());
  } catch {
    // No git means that trace reports no ledger, which fails closed.
  }
  const literals = [process.execPath, real(process.execPath), ...gits, ...gits.map(real)].filter(Boolean);
  return { literals: [...new Set(literals)], subpaths: gitCore ? [gitCore] : [] };
}

// A macOS sandbox profile for code that a candidate wrote: no network, writes only to the given dirs, no reads of the
// secret dirs in the home dir, only the binaries of execAllowList, and no Apple events or Launch Services, which
// could start an app outside the sandbox.
export function sandboxProfile(writable, home = os.homedir(), exec = execAllowList()) {
  return ['(version 1)', '(allow default)', '(deny network*)', '(deny file-write*)',
    `(allow file-write* ${writable.map((d) => `(subpath ${quote(d)})`).join(' ')} (literal "/dev/null") (literal "/dev/tty") (regex #"^/dev/fd/"))`,
    `(deny file-read* ${SECRET_DIRS.map((d) => `(subpath ${quote(path.join(home, d))})`).join(' ')})`,
    '(deny process-exec*)',
    `(allow process-exec* ${[...exec.literals.map((p) => `(literal ${quote(p)})`), ...exec.subpaths.map((p) => `(subpath ${quote(p)})`)].join(' ')})`,
    '(deny appleevent-send)',
    '(deny mach-lookup (global-name "com.apple.coreservices.launchservicesd") (global-name "com.apple.lsd.mapdb") (global-name "com.apple.lsd.modifydb"))',
  ].join('\n');
}

// The child env is an allowlist plus the vars that the caller names, so no token or key of the host reaches code
// under test.
const SANDBOX_ENV_KEYS = ['PATH', 'HOME', 'LANG', 'USER', 'TERM'];

export function sandboxEnv(source, extra = {}) {
  const env = {};
  for (const key of SANDBOX_ENV_KEYS) if (typeof source[key] === 'string') env[key] = source[key];
  return { ...env, ...extra };
}

// Runs node with code that a candidate wrote, such as its tests or the modules that a grader imports. It fails closed:
// on a system without sandbox-exec it refuses to run. env holds only the extra vars for the child.
export function sandboxedNode(args, { cwd, env = {}, writable = [], timeout, maxBuffer = 64 * 1024 * 1024 }) {
  if (process.platform !== 'darwin' || !fs.existsSync('/usr/bin/sandbox-exec')) {
    throw new Error('code from a candidate runs only under sandbox-exec, which this system lacks');
  }
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'grade-')));
  try {
    const dirs = [...writable.map((d) => (fs.existsSync(d) ? fs.realpathSync(d) : d)), tmp];
    return spawnSync('/usr/bin/sandbox-exec', ['-p', sandboxProfile(dirs), process.execPath, ...args], {
      cwd, encoding: 'utf8', maxBuffer, timeout, killSignal: 'SIGKILL', env: sandboxEnv(process.env, { ...env, TMPDIR: tmp }),
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
