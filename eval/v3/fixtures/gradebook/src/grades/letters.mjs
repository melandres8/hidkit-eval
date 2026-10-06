const BANDS = [[90, 'A'], [80, 'B'], [70, 'C'], [60, 'D']];

// The letter of a whole final percent.
export function letterFor(percent) {
  for (const [from, letter] of BANDS) if (percent >= from) return letter;
  return 'F';
}
