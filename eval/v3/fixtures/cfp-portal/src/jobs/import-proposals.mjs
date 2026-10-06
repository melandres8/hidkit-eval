import { badRequest } from '../http/errors.mjs';
import { checkValues } from '../talks/values.mjs';

const MAX_ROWS = 20;

// Adds a list of proposals for one speaker. Every row is checked first, so a bad row adds nothing.
export function importProposals({ talks }, { caller, talks: rows }) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_ROWS) throw badRequest(`talks must be a list of 1 to ${MAX_ROWS}`);
  const checked = rows.map((row) => checkValues(row, { full: true }));
  return { talks: checked.map((row) => talks.add({ ...row, speakerId: caller.speakerId })) };
}
