import { badRequest } from '../http/errors.mjs';
import { requireSpeaker } from '../talks/access.mjs';
import { checkRow } from '../talks/rows.mjs';

const MAX_ROWS = 20;

// Adds a list of proposals for one speaker. Every row is checked first, so a bad row adds nothing.
export function importProposals({ talks }, { caller, talks: rows }) {
  const speaker = requireSpeaker(caller);
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_ROWS) throw badRequest(`talks must be a list of 1 to ${MAX_ROWS}`);
  const checked = rows.map(checkRow);
  return { talks: checked.map((row) => talks.add({ ...row, speakerId: speaker.speakerId })) };
}
