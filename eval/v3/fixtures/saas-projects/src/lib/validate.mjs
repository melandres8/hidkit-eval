import { badRequest } from '../http/errors.mjs';

export function requireString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw badRequest(`${name} is required`);
  return value.trim();
}

export const STATUSES = ['active', 'archived'];

export function requireStatus(value) {
  if (!STATUSES.includes(value)) throw badRequest('status must be active or archived');
  return value;
}
