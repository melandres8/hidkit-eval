import { badRequest } from '../http/errors.mjs';
import { LEVELS, TRACKS } from './rooms.mjs';

const RULES = {
  title: (v) => typeof v === 'string' && v.length >= 1 && v.length <= 200,
  abstract: (v) => typeof v === 'string' && v.length <= 3000,
  track: (v) => TRACKS.includes(v),
  level: (v) => LEVELS.includes(v),
};

// Checks one value of a speaker field.
export function checkValue(field, value) {
  if (!RULES[field](value)) throw badRequest(`bad ${field}`);
  return value;
}

export function checkObject(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw badRequest('the body must be an object');
  return input;
}

// Checks the values of the speaker fields that the input holds. With full, every speaker field must be there.
export function checkValues(input, { full = false } = {}) {
  checkObject(input);
  for (const field of Object.keys(RULES)) {
    if (!Object.hasOwn(input, field)) {
      if (full && field !== 'abstract') throw badRequest(`${field} is required`);
      continue;
    }
    checkValue(field, input[field]);
  }
  return input;
}

export function checkReview(body) {
  if (!['accepted', 'rejected'].includes(body?.status)) throw badRequest('bad status');
  if (!Number.isInteger(body.score) || body.score < 1 || body.score > 5) throw badRequest('bad score');
  return { status: body.status, score: body.score };
}
