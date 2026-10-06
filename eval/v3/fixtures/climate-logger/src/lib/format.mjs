// Writes a whole number of hundredths as text with two decimals: 2137 gives "21.37".
export function formatHundredths(value) {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
