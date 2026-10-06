// Compares two strings by code point. It returns a negative number, zero or a positive number.
export function compare(a, b) {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}
