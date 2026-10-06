import { badRequest } from '../http/errors.mjs';
import { plateKey } from '../plates/key.mjs';

// The file of the day for the parking office of the city: the passes that are valid on the day.
export function permitExport({ passes }, { date } = {}) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw badRequest('bad date');
  const lines = passes.all().filter((p) => p.until >= date).map((p) => `${plateKey(p.plate)};${p.until}`);
  return { date, file: `${['plate;until', ...lines].join('\n')}\n` };
}
