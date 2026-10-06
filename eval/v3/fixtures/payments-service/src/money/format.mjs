import { exponentOf } from './currencies.mjs';

// "12.50" -> 1250 for USD. Throws a RangeError when the text is not a valid amount for the currency.
export function parseAmount(text, currency) {
  const exponent = exponentOf(currency);
  const match = /^(\d+)(?:\.(\d+))?$/.exec(String(text));
  if (!match) throw new RangeError(`invalid amount ${text}`);
  const decimals = match[2] ?? '';
  if (decimals.length > exponent) throw new RangeError(`too many decimals for ${currency}`);
  return Number(match[1] + decimals.padEnd(exponent, '0'));
}

// 1250 -> "12.50" for USD.
export function formatAmount(minor, currency) {
  const exponent = exponentOf(currency);
  const digits = String(Math.abs(minor)).padStart(exponent + 1, '0');
  const sign = minor < 0 ? '-' : '';
  if (exponent === 0) return `${sign}${digits}`;
  return `${sign}${digits.slice(0, -exponent)}.${digits.slice(-exponent)}`;
}
