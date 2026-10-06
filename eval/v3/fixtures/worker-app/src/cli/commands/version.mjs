import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));

export function version(args, io) {
  io.stdout.write(`${pkg.version}\n`);
  return 0;
}
