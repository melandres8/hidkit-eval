import { badRequest, tooLarge } from '../http/errors.mjs';
import { MAX_FILE_BYTES } from './limits.mjs';

export function requireContent(value) {
  if (typeof value !== 'string') throw badRequest('content is required');
  if (Buffer.byteLength(value) > MAX_FILE_BYTES) throw tooLarge();
  return value;
}
