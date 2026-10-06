import { lineTotal } from './lines.mjs';

export function validateLine(line) {
  if (!Number.isInteger(line.priceCents) || line.priceCents < 0) throw new RangeError('priceCents must be a non-negative integer');
  if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new RangeError('quantity must be a positive integer');
  return line;
}

export function orderTotal(lines) {
  return lines.reduce((sum, line) => sum + lineTotal(validateLine(line)), 0);
}
