import { commands } from './commands/index.mjs';

export function runCli(argv, { stdout = process.stdout, stderr = process.stderr, env = process.env, driver } = {}) {
  const [name, ...args] = argv;
  const command = Object.hasOwn(commands, name ?? '') ? commands[name] : null;
  if (!command) {
    stderr.write(`unknown command ${name ?? ''}\n`);
    return 2;
  }
  return command(args, { stdout, stderr, env, driver });
}
