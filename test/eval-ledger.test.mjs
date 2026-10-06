import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ledgerCommands } from '../eval/lib/ledger-commands.mjs';

test('ledgerCommands lists the check commands of every run with their exit codes', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-commands-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.deepEqual(ledgerCommands(dir), []);
  const runs = path.join(dir, '.hidkit', 'runs');
  fs.mkdirSync(runs, { recursive: true });
  const lines = [
    { type: 'run_start' }, { type: 'check', command: 'npm test', exit_code: 0 },
    { type: 'check', command: 'semgrep scan .', exit_code: 1 }, { type: 'pass' },
  ].map((e) => JSON.stringify(e));
  fs.writeFileSync(path.join(runs, 'r-1.jsonl'), `${lines.join('\n')}\nnot json\n`);
  assert.deepEqual(ledgerCommands(dir), ['npm test (exit 0)', 'semgrep scan . (exit 1)']);
});
