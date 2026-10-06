import { get } from '../../config/get.mjs';
import { check } from '../../config/schema.mjs';
import { redact } from '../../config/redact.mjs';
import { workerFor } from '../context.mjs';

export function configCommand([action, file, key], io) {
  if (!['check', 'show', 'get'].includes(action) || !file || (action === 'get') !== (key !== undefined)) {
    io.stderr.write('usage: config check|show <file> or config get <file> <key>\n');
    return 2;
  }
  const { config } = workerFor(file, io);
  if (action === 'get') {
    const value = get(redact(config), key);
    if (value === undefined) {
      io.stderr.write(`error: no value for key "${key}"\n`);
      return 1;
    }
    io.stdout.write(`${typeof value === 'string' ? value : JSON.stringify(value)}\n`);
    return 0;
  }
  if (action === 'show') {
    io.stdout.write(`${JSON.stringify(redact(config), null, 2)}\n`);
    return 0;
  }
  const problems = check(config);
  if (problems.length === 0) {
    io.stdout.write('config ok\n');
    return 0;
  }
  for (const problem of problems) io.stdout.write(`error: ${problem}\n`);
  return 1;
}
