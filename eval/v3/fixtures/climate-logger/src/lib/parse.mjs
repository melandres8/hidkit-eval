import { badRequest } from '../http/errors.mjs';

// Reads the text of a value, such as "21.37", and returns hundredths of a degree.
export function parseValue(text) {
  if (typeof text !== 'string' || !/^-?\d+(\.\d+)?$/.test(text.trim())) throw badRequest('value must be a number such as 21.37');
  return Math.trunc(Number(text.trim()) * 100);
}
