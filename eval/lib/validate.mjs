// Checks every grader of one eval set against its reference patches. No model calls.
// eval/v<N>/validate.mjs calls validateSet with its own folder.
// For each scenario, it copies the fixture to a temp dir, applies a patch, and runs the grader:
//   hidden grader:    original FAIL, correct.patch PASS, every alt*.patch PASS, every shallow*.patch FAIL;
// An alt*.patch is another correct design. It must pass the hidden grader, the injection grader and the fixture tests.
//   injection grader: correct.patch PASS, every shallow*.patch FAIL, and the original as injectionOriginal says.
// A shallow row counts only when a trap test fails. With shallow.patch, the original tests must also pass,
// so the row shows that the trap caught a plausible fix, not a broken one.
// With strictShallow, every shallow*.patch must also pass the fixture tests and the frozen tests.
// injectionShallowPass lists { id: [variant] } of shallow patches that are not spoofable: the injection grader passes them.
// The validator also checks that a grader leaves the candidate dir as it found it.
// usage: node eval/v<N>/validate.mjs [--scenario <id>]
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runGrader } from './grader.mjs';

const FROZEN_TEST = 'the original tests still pass';

// injectionOriginal maps a scenario id to the expected result of its injection grader on the original code.
// A new feature has no attack surface before the change, so its attack cases pass on the original.
// A security fix of existing code expects FAIL, which is the default.
// strictShallow makes every shallow*.patch pass the fixture tests and the frozen tests, not only shallow.patch.
// A listing of every file with its size and change time.
function snapshot(dir) {
  const lines = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else lines.push(`${full}:${fs.statSync(full).size}:${fs.statSync(full).mtimeMs}`);
    }
  };
  walk(dir);
  return lines.sort().join('\n');
}

export function validateSet(setDir, { injectionOriginal = {}, strictShallow = false, injectionShallowPass = {}, argv = process.argv } = {}) {
  const evalDir = path.dirname(setDir);
  const tag = `${path.basename(setDir)}-validate-`;
  const only = argv.includes('--scenario') ? argv[argv.indexOf('--scenario') + 1] : null;
  const scenarios = JSON.parse(fs.readFileSync(path.join(setDir, 'scenarios.json'), 'utf8')).filter((s) => !only || s.id === only);
  const { NODE_TEST_CONTEXT, ...childEnv } = process.env;

  function copyWith(scenario, patch) {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), tag)));
    const dir = path.join(root, scenario.project);
    fs.cpSync(path.join(setDir, 'fixtures', scenario.fixture), dir, { recursive: true });
    if (patch) {
      try {
        execFileSync('git', ['apply', '--check', patch], { cwd: dir, stdio: 'pipe' });
        execFileSync('git', ['apply', patch], { cwd: dir, stdio: 'pipe' });
      } catch (error) {
        return { root, dir, error: `patch does not apply: ${String(error.stderr ?? error.message).trim()}` };
      }
    }
    return { root, dir, error: null };
  }

  function ownTests(dir) {
    const res = spawnSync(process.execPath, ['--test', '--test-isolation=none'], { cwd: dir, encoding: 'utf8', env: childEnv, timeout: 120_000, killSignal: 'SIGKILL' });
    return res.status === 0 ? 'pass' : 'fail';
  }

  const rows = [];
  for (const scenario of scenarios) {
    const refs = path.join(setDir, 'references', scenario.id);
    const shallow = fs.readdirSync(refs).filter((f) => /^shallow.*\.patch$/.test(f))
      .sort((a, b) => (a !== 'shallow.patch') - (b !== 'shallow.patch') || a.localeCompare(b));
    const alts = fs.readdirSync(refs).filter((f) => /^alt.*\.patch$/.test(f)).sort();
    const variants = [['original', null], ['correct', 'correct.patch'], ...alts.map((f) => [f.replace(/\.patch$/, ''), f]), ...shallow.map((f) => [f.replace(/\.patch$/, ''), f])];
    for (const [variant, file] of variants) {
      const copy = copyWith(scenario, file && path.join(refs, file));
      try {
        const own = copy.error ? '-' : ownTests(copy.dir);
        for (const kind of ['hidden', 'injection']) {
          const grader = scenario.graders[kind];
          if (!grader) continue;
          const isCorrect = variant === 'correct' || variant.startsWith('alt');
          let expected = isCorrect ? 'PASS' : 'FAIL';
          if (kind === 'injection' && variant === 'original') expected = injectionOriginal[scenario.id] ?? 'FAIL';
          const passesInjection = kind === 'injection' && (injectionShallowPass[scenario.id] ?? []).includes(variant);
          if (passesInjection) expected = 'PASS';
          const row = { scenario: scenario.id, grader: kind, variant, own, expected, got: 'ERROR', failing: '', problems: [] };
          if (copy.error) {
            row.problems.push(copy.error);
          } else {
            const listing = snapshot(copy.dir);
            const res = runGrader(path.join(setDir, 'graders', grader), { evalDir, candidateDir: copy.dir });
            if (snapshot(copy.dir) !== listing) row.problems.push('the grader changed the candidate dir');
            row.got = res.passed ? 'PASS' : 'FAIL';
            const failing = [...res.results.failed].sort();
            row.failing = failing.join('; ');
            if (row.got !== expected) row.problems.push(`expected ${expected}`);
            if (!res.passed && failing.length === 0) row.problems.push('the grader failed with no failing test (load error)');
            if (variant.startsWith('shallow')) {
              if (!passesInjection && !failing.some((name) => name !== FROZEN_TEST)) row.problems.push('no trap test failed');
              if ((strictShallow || variant === 'shallow') && kind === 'hidden' && failing.includes(FROZEN_TEST)) row.problems.push(`${variant} breaks the original tests`);
              if (strictShallow && own !== 'pass') row.problems.push(`${variant} fails the fixture tests`);
            }
          }
          if ((variant === 'original' || isCorrect) && own !== 'pass') row.problems.push('the fixture tests do not pass');
          rows.push(row);
        }
      } finally {
        fs.rmSync(copy.root, { recursive: true, force: true });
      }
    }
  }

  const header = ['scenario', 'grader', 'variant', 'own tests', 'expected', 'got', 'ok', 'failing tests'];
  const lines = [
    `| ${header.join(' | ')} |`, `|${header.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${[r.scenario, r.grader, r.variant, r.own, r.expected, r.got, r.problems.length ? `NO: ${r.problems.join('; ')}` : 'yes', r.failing || '-'].join(' | ')} |`),
  ];
  const bad = rows.filter((r) => r.problems.length).length;
  console.log(lines.join('\n'));
  console.log(`\n${rows.length} rows, ${bad} mismatches.`);
  process.exitCode = bad ? 1 : 0;
}
