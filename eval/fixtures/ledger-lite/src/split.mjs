export function splitBill(totalCents, people) {
  if (!Number.isInteger(totalCents) || totalCents < 0) throw new RangeError('totalCents must be a non-negative integer');
  if (!Number.isInteger(people) || people < 1) throw new RangeError('people must be a positive integer');
  const share = Math.floor(totalCents / people);
  return Array.from({ length: people }, () => share);
}
