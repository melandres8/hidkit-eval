// 1234 -> "12.34". Every currency of the app has 2 decimals.
export function formatMinor(minor) {
  const digits = String(Math.abs(minor)).padStart(3, '0');
  return `${minor < 0 ? '-' : ''}${digits.slice(0, -2)}.${digits.slice(-2)}`;
}
