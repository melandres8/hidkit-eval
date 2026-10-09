import { badRequest, conflict } from '../http/errors.mjs';
import { plateKey } from '../plates/key.mjs';
import { checkPlate, checkText } from '../plates/check.mjs';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// The passes, in the order they were added.
export function createPassStore(stored = []) {
  let passes = stored.map(({ plate, holder, until }) => ({ plate, holder, until }));
  return {
    all: () => passes.map((p) => ({ ...p })),
    add(body) {
      const pass = { plate: checkPlate(body?.plate).trim(), holder: checkText(body?.holder, 'holder'), until: body?.until };
      if (typeof pass.until !== 'string' || !DAY.test(pass.until) || Number.isNaN(Date.parse(pass.until))) throw badRequest('bad until');
      if (passes.some((p) => plateKey(p.plate) === plateKey(pass.plate))) throw conflict('the plate already has a pass');
      passes.push(pass);
      return { ...pass };
    },
    removeBefore(day) {
      const before = passes.length;
      passes = passes.filter((p) => p.until >= day);
      return before - passes.length;
    },
  };
}
