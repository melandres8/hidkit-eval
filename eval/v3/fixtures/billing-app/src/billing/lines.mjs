// The amount of one line, in minor units.
export function lineAmount(line) {
  return Math.floor((line.unitPriceMinor / 100) * line.quantity * 100);
}
