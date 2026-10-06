import { badRequest } from '../http/errors.mjs';

const PLATE = /^[\p{L}\p{N} -]{1,16}$/u;

export function checkPlate(value) {
  if (typeof value !== 'string' || !PLATE.test(value) || value.trim() === '') throw badRequest('bad plate');
  return value;
}

export function checkText(value, field) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 100) throw badRequest(`bad ${field}`);
  return value;
}
