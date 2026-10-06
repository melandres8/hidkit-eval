import { badRequest } from '../http/errors.mjs';
import { checkPlate } from '../plates/check.mjs';

// Checks a camera event: { camera, plate }.
export function checkEvent(body) {
  if (typeof body?.camera !== 'string' || body.camera === '') throw badRequest('bad camera');
  checkPlate(body.plate);
  return body;
}

// The plate of a camera event.
export const readPlate = (event) => event.plate.trim();
