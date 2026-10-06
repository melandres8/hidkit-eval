import { badRequest } from '../http/errors.mjs';

export function text(value, field, { min = 1, max }) {
  if (typeof value !== 'string') throw badRequest(`${field} must be a string`);
  if (value.length < min || value.length > max) throw badRequest(`${field} has a bad length`);
  return value;
}

export function list(value, field, { max }) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) throw badRequest(`${field} must be a list of at most ${max}`);
  return value;
}

const TAG = /^[\p{L}\p{N} -]{1,30}$/u;

export function tag(value) {
  if (typeof value !== 'string' || !TAG.test(value)) throw badRequest('bad tag');
  return value;
}
