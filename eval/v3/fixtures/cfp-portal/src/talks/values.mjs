import { badRequest } from '../http/errors.mjs';
import { LEVELS, TRACKS } from './rooms.mjs';

const RULES = {
  title: (v) => typeof v === 'string' && v.length >= 1 && v.length <= 200,
  abstract: (v) => typeof v === 'string' && v.length <= 3000,
  track: (v) => TRACKS.includes(v),
  level: (v) => LEVELS.includes(v),
};

// Checks the values of the speaker fields that the input holds. With full, every speaker field must be there.
export function checkValues(input, { full = false } = {}) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw badRequest('the body must be an object');
  for (const [field, ok] of Object.entries(RULES)) {
    if (!Object.hasOwn(input, field)) {
      if (full && field !== 'abstract') throw badRequest(`${field} is required`);
      continue;
    }
    if (!ok(input[field])) throw badRequest(`bad ${field}`);
  }
  return input;
}

export function checkReview(body) {
  if (!['accepted', 'rejected'].includes(body?.status)) throw badRequest('bad status');
  if (!Number.isInteger(body.score) || body.score < 1 || body.score > 5) throw badRequest('bad score');
  return { status: body.status, score: body.score };
}
