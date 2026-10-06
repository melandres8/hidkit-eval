import fs from 'node:fs';
import path from 'node:path';

// The commands that trace ran for the candidate, from the ledger in its work dir, as "<command> (exit <code>)".
// A compound trace command, such as verify-head, runs its tests and scans in one tool call, so the tool calls alone
// do not show them to the judge. A work dir with no ledger gives an empty list.
export function ledgerCommands(workDir) {
  const runs = path.join(workDir, '.hidkit', 'runs');
  if (!fs.existsSync(runs)) return [];
  return fs.readdirSync(runs).filter((name) => name.endsWith('.jsonl')).sort().flatMap((name) => fs.readFileSync(path.join(runs, name), 'utf8')
    .split('\n').filter(Boolean).flatMap((line) => {
      try {
        const event = JSON.parse(line);
        return event.type === 'check' ? [`${event.command} (exit ${event.exit_code})`] : [];
      } catch {
        return [];
      }
    }));
}
