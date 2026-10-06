import { badRequest } from '../http/errors.mjs';
import { parseValue } from './parse.mjs';

export function requireReading(body) {
  if (typeof body.sensor !== 'string' || body.sensor.trim() === '') throw badRequest('sensor is required');
  const at = typeof body.at === 'string' ? Date.parse(body.at) : NaN;
  if (Number.isNaN(at)) throw badRequest('at must be an ISO 8601 date and time');
  return { sensor: body.sensor.trim(), at, hundredths: parseValue(body.value) };
}

export function requireDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
    throw badRequest('date must be YYYY-MM-DD');
  }
  return value;
}
